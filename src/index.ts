// For Default export
import { EventEmitter } from 'events';
import { AllAuthZOptions, decorate } from './instrument/decorator';
import { hook } from './instrument/plugin';
import { ConfigFactory, IAuthorizonConfig } from './config';
import { IAuthorizonCache, LocalCacheClient } from './cache/client';
import { ResourceRegistry } from './resources/registry';
import { IResourceReporter, ResourceReporter } from './resources/reporter';
import { Enforcer, IEnforcer } from './enforcement/enforcer';
import { AppManager } from './instrument/appManager';
import { IMutationsClient, MutationsClient } from './mutations/client';

interface IEventSubscriber {
  on(event: string | symbol, listener: (...args: any[]) => void): EventEmitter;
  once(event: string | symbol, listener: (...args: any[]) => void): EventEmitter;
}

export interface IAuthorizonClient extends IEventSubscriber, IResourceReporter, IEnforcer, IMutationsClient {
  cache: IAuthorizonCache;
  instrument(): void;
  decorate(target: any, options: AllAuthZOptions): any;
}

/**
 * The AuthorizonSDK class is a simple factory that returns
 * an initialized IAuthorizonClient object that the user can work with.
 *
 * The authorizon client can signal when its available.
 * all actions with the client should be after the 'ready' event has fired,
 * as shown below.
 *
 * usage example:
 * const authorizon: IAuthorizonClient = AuthorizonSDK.init({ // config });
 * authorizon.once('ready', () => {
 *  const allowed = await authorizon.isAllowed(user, action, resource);
 *  ...
 * })
 */
export class AuthorizonSDK {
  public static init(config: Partial<IAuthorizonConfig>): IAuthorizonClient {
    const events = new EventEmitter();
    const configOptions = ConfigFactory.build(config);
    const resourceRegistry = new ResourceRegistry();
    const resourceReporter = new ResourceReporter(configOptions, resourceRegistry);
    const enforcer = new Enforcer(configOptions);
    const cache = new LocalCacheClient(configOptions);
    const mutationsClient = new MutationsClient(configOptions);
    const appManager = new AppManager(configOptions, resourceReporter);
    // logger.info(`authorizon.init(), sidecarUrl: ${configOptions.sidecarUrl}`);

    // TODO: close a loop with the sidecar and backend and signal real success.
    events.emit('ready');

    return {
      // exposed methods from specialized clients
      ...enforcer.getMethods(),
      ...resourceReporter.getMethods(),
      ...mutationsClient.getMethods(),
      cache: cache.getMethods(),

      // instrumentation methods
      instrument: () => { hook(appManager); },
      decorate: decorate,

      // event emitter (read only, i.e: subscriber)
      on: events.on.bind(events),
      once: events.once.bind(events),
    }
  }
}

// const authorizon: IAuthorizonClient = AuthorizonSDK.init({});

// // export const transformResourceContext = enforcer.addResourceContextTransform.bind(enforcer);
// // export const provideContext = enforcer.addContext.bind(enforcer);
// export const getResourceAndAction = resourceRegistry.getResourceAndActionFromRequestParams.bind(resourceRegistry);
