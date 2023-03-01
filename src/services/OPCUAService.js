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
  /* dev */
  UserIdentityInfoUserName,
  UserTokenType,
  ErrorCallback
} from 'node-opcua'

import { EventEmitter } from 'events'

class OPCUAService extends EventEmitter {
  constructor(options) {
    super()
    // ----------------------------------
    this.endpointUrl = options.url
    this.session = null
    this.subscription = null
    this.client = OPCUAClient.create({
      applicationName: 'Panel',

      securityMode: MessageSecurityMode.None,
      securityPolicy: SecurityPolicy.None,

      endpointMustExist: false,
      keepSessionAlive: true,
      connectionStrategy: {
        initialDelay: 2000,
        maxDelay: 10000
      },
      certificateFile: options.certificateFile,
      privateKeyFile: options.privateKeyFile
    })


    // ----------------------------------
    console.log('OPCUAService url:', this.endpointUrl)

  } // end constructor

  // methods
  // ------------------------------------
  async stop()  {
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
    // ----------------------------------
    await this.stop()
    await this.client.connect(this.endpointUrl)
    console.log(`$$ Connected to ${this.endpointUrl}`)
    // ----------------------------------
    this.session = await this.client.createSession()
    this.subscription = ClientSubscription.create(this.session, {
      publishingEnabled: true,
      maxNotificationsPerPublish: 1000,
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      priority: 10
    })
    // ----------------------------------
    this.subscription = ClientSubscription.create(this.session, {
      publishingEnabled: true,
      maxNotificationsPerPublish: 1000,
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      priority: 10
    })
    // ----------------------------------

    this.subscription
        .on('started', () => {
          console.log(
            'subscription started for 2 seconds - subscriptionId=',
            this.subscription.subscriptionId
          )
        })
        .on('keepalive', () => {
          console.log('subscription keepalive')
        })
        .on('terminated', () => {
          console.log('subscription terminated')
        })
        .on('internal_error', (err) => {
          console.log('subscription internal_error', err)
        })
        .on('error', (err) => {
          console.log('subscription error', err)
        })
        .on('status_changed', (status, diagnosticInfo) => {
          console.log('subscription status', status)
          console.log('subscription diagnosticInfo', diagnosticInfo)
        })
    // ----------------------------------
    let itemsToMonitor = [

      {
        nodeId:  {
          identifierType: 2,
          value: '::AsGlobalPV:PostN[1].progStatusMask',
          namespace: 6
        },
        attributeId: 13
      },
      
      {
        nodeId:  {
          identifierType: 2,
          value: '::AsGlobalPV:PostN[1].progShowMask',
          namespace: 6
        },
        attributeId: 13
      },
      {
        nodeId:  {
          identifierType: 2,
          value: '::AsGlobalPV:PostN[1].progPrice',
          namespace: 6
        },
        attributeId: 13
      },
      {
        nodeId:  {
          identifierType: 2,
          value: '::AsGlobalPV:DateTime.Time',
          namespace: 6
        },
        attributeId: 13
      }

    ]

    // ----------------------------------
    try {
      this.monitoredItemGroup = ClientMonitoredItemGroup.create(
        this.subscription,
        /* ? */
        itemsToMonitor,
        {
          samplingInterval: 10,
          discardOldest: true,
          queueSize: 1
        },
        TimestampsToReturn.Both,
      )
    } catch (err) {
      console.log('$$ ClientMonitoredItemGroup.create(...) err:', err)
    }
    // ----------------------------------
    this.monitoredItemGroup
        .on(
          'changed',
          (
            monitoredItem,
            dataValue,
            index
          ) => {
            try {
              console.log('$$ dataValue', dataValue.value)

            } catch (err) {
              console.log(err)
            }
          }
        )
        .on('err', () => {
          console.log('monitoredItemGroup err')
        })
        .on('terminated', () => {
          console.log('monitoredItemGroup terminated')
        })
        .on('initialized', () => {
          console.log('monitoredItemGroup initialized')
        })


  }

}


export { OPCUAService }