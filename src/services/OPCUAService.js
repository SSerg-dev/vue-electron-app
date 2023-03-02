import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  ClientSubscription,
  TimestampsToReturn,
  ClientSession,
  ClientMonitoredItemGroup,
  ClientMonitoredItemBase,
  DataValue,
  coerceNodeId,
  resolveNodeId,
  UserIdentityInfoUserName,
  UserTokenType,
  ErrorCallback,
} from 'node-opcua'

import { EventEmitter } from 'events'

export class OPCUAService extends EventEmitter {
  constructor(options) {
    super()
    // ----------------------------------
    this.options = options
    this.endpointUrl = options.url
    this.session = null
    this.subscription = null

    this.client = OPCUAClient.create({
      //applicationName: 'Panel',

      securityMode: MessageSecurityMode.None,
      securityPolicy: SecurityPolicy.None,

      endpointMustExist: false,//options.endpointMustExist,
      //nodeset_filename: options.nodeset_filename,

      keepSessionAlive: true,
      connectionStrategy: {
        initialDelay: 2000,
        maxDelay: 10000,
      },
      //certificateFile: options.certificateFile,
      //privateKeyFile: options.privateKeyFile,
    })

    this.client.on("connection_failed", () => {
      console.log(`Client failed to connect.`);
    }).on("connection_lost", () => {
        console.log(`Client lost the connection.`);
    }).on("start_reconnection", () => {
        console.log(`Client is starting the reconnection process.`);
    }).on("reconnection_attempt_has_failed", (_, message) => {
        console.log(`Client reconnection attempt has failed: ${message}`);
    }).on("after_reconnection", () => {
        console.log(`Client finished the reconnection process.`);
    }).on("backoff", (attemptNumber, delay) => {
        console.log(`Client connection retry attempt ${attemptNumber} retrying in ${delay}ms.`);
    }).on("close", () => {
        console.log(`Client closed and disconnected`);
    }).on("timed_out_request", (request) => {
        console.log(`Client request timed out: ${request.toString()}`);
    });
  

    // ----------------------------------
    console.log('OPCUAService url:', this.endpointUrl)
  } // end constructor

  // methods
  // ------------------------------------
  async stop() {
    if (this.session || this.subscription) {
      this.session = null
      this.subscription = null
      try {
        await this.monitoredItemGroup.terminate()
        if (this.session) {
          await this.session.close()
          console.log(`OPC UA session closed`)
        }
        await this.client.disconnect()
        console.log(`OPC UA server disconected`)
      } catch (err) {
        console.log(`OPC UA server disconected or session close - error:`, err)
      }
    }
  }

  // ------------------------------------
  async start(type = 'Post', num = 2) {

    try {
      // ----------------------------------
      await this.stop()
      await this.client.connect(this.endpointUrl)
      console.log(`$$ Connected to ${this.endpointUrl}`)

      // ----------------------------------
      this.session = await this.client.createSession()
      
      this.session.on("keepalive", () => {
        console.log(`Session keepalive received.`);
      }).on("keepalive_failure", (state) => {
          console.log(`Session encountered a keepalive error: ${state !== undefined ? state.toString() : "No state provided."}`);
      }).on("session_closed", (statusCode) => {
          console.log(`Session closed. Status code: ${statusCode.toString()}`);
      }).on("session_restored", () => {
          console.log(`Session restored.`);
      });


      // ----------------------------------
      this.subscription = ClientSubscription.create(this.session, {
        requestedPublishingInterval: 1000,
        requestedMaxKeepAliveCount: 5,
        requestedLifetimeCount: 10,
        maxNotificationsPerPublish: 10,
        publishingEnabled: true,
        priority: 10,
      })

      // ----------------------------------

      this.subscription.on("started", () => {
        console.log(`Subscription started, subscriptionId: ${this.subscription.subscriptionId}`);
      }).on("terminated", () => {
          console.log(`Subscription '${this.subscription.subscriptionId}' was terminated.`);
      }).on("keepalive", () => {
          console.log(`Subscription '${this.subscription.subscriptionId}' keepalive received.`);
      }).on("internal_error", (err) => {
          console.log(`Subscription '${this.subscription.subscriptionId}' encountered an internal error: ${err.message}`);
      }).on("status_changed", (status, diagnosticInfo) => {
          console.log(
              `Subscription '${this.subscription.subscriptionId}' status changed. New status: ${status.toString()}. ` +
              `Diagnostics: ${diagnosticInfo.toString()}`
          );
      }).on("error", (err) => {
          console.log(`Subscription '${this.subscription.subscriptionId}' encountered a (non-internal) error: ${err.message}`);
      });

      let itemsToMonitor = [];
      const nodes = require("/home/frontend/deploy/vue-electron-app/node.json");

      Object.keys(nodes).forEach(name => {
          itemsToMonitor.push({
              nodeId: "ns=6;s=" + String(name),
              attributeId: AttributeIds.Value
          });
      });

      this.monitoredItemGroup  = ClientMonitoredItemGroup.create(
          this.subscription,
          itemsToMonitor,
          {
              samplingInterval: 1000,
              discardOldest: true,
              queueSize: 100
          },
          TimestampsToReturn.Both
      );

      this.monitoredItemGroup.on("err", (err) => console.log("Monitored item group error:", err));
      this.monitoredItemGroup.on("terminated", (err) => console.log("Monitored item group terminated:", err));
      this.monitoredItemGroup.on("initialized", () => console.log("Monitored item group initialized"));

      this.monitoredItemGroup.on("changed", (monitoredItem, dataValue, index) => {
          const value = String(dataValue.value.value);
          const nodeId = String(monitoredItem.itemToMonitor.nodeId.value);
          console.log("new data:", nodeId, value);
      });

    } catch (err) {
      console.log("An error has occured : ", err);
    }
  }

}

// export { OPCUAService }
