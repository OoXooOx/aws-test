import * as fs from 'node:fs';
import * as path from 'node:path';
import { Environment, EnvironmentConfig } from '../src/shared/types';

/**
 * Load environment configuration from JSON file
 */
export function loadEnvironmentConfig(environment: Environment): EnvironmentConfig {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'environments.json');

        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }

        console.log(`📋 Loading configuration from: ${configPath}`);

        const configContent = fs.readFileSync(configPath, 'utf-8');
        const allConfigs = JSON.parse(configContent);

        if (!allConfigs[environment]) {
            throw new Error(
                `Environment '${environment}' not found in configuration. Available: ${Object.keys(allConfigs).join(', ')}`,
            );
        }

        const config = allConfigs[environment];
        console.log(`✅ Configuration loaded for environment: ${environment}`);

        return config as EnvironmentConfig;
    } catch (error) {
        throw new Error(`Failed to load configuration for environment '${environment}': ${(error as Error).message}`);
    }
}

