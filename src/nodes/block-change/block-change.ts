import merge from 'lodash/merge';
import { NodeInitializer } from 'node-red';

import { schemas } from '../../schemas';
import { Block, SparkStateEvent } from '../../shared-types';
import { BlockPatch } from '../../types';
import { validate } from '../../validation';
import { BlockChangeNode, BlockChangeNodeDef } from './shared/types';

const nodeInit: NodeInitializer = (RED): void => {
  function BlockChangeNodeConstructor(
    this: BlockChangeNode,
    config: BlockChangeNodeDef,
  ): void {
    RED.nodes.createNode(this, config);

    this.on('input', (msg, send, done) => {
      if (config.merge === 'cache-msg') {
        const patch = validate<BlockPatch>(schemas.BlockPatch, msg.payload);

        if (!patch) {
          return done();
        }

        const cache = this.context().global.get(`brewblox/spark/${patch.serviceId}`);
        const state = validate<SparkStateEvent>(schemas.SparkStateEvent, cache);

        if (!state) {
          return done();
        }

        const base = state
          .data
          .blocks
          .find(block => block.id === patch.id);

        if (!base) {
          return done();
        }

        msg.payload = merge(base, patch);
      }

      if (config.merge === 'msg-input') {
        const base = validate<Block>(schemas.Block, msg.payload);
        const patch = JSON.parse(config.patch);

        if (!base) {
          return done();
        }

        msg.payload = merge(base, patch);
      }

      if (!validate(schemas.Block, msg.payload)) {
        throw new Error(`Merged data is not a valid Block: ${JSON.stringify(msg.payload)}`);
      }

      send(msg);
      done();
    });
  }

  RED.nodes.registerType('block-change', BlockChangeNodeConstructor);
};

export = nodeInit;
