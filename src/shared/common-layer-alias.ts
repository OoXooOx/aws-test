/**
 * Lambda Layer Imports Management
 *
 * This file serves two purposes:
 * 1. Development: Points to local layer source code
 * 2. Runtime: Gets replaced with /opt/nodejs paths in Lambda
 *
 * Usage:
 * - In development: import from 'src/shared/common-layer-alias'
 * - In Lambda: imports are automatically replaced with layer paths
 */

export * from '../layers/common/src/index';

