// AWS utilities for Lambda functions
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Phrase } from '../../../shared/types';

// DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.TABLE_NAME!;

// Counter ID (fixed ID for counter record)
const COUNTER_ID = 0;

// TTL Configuration
const TASK_TTL_SECONDS = parseInt(process.env.TASK_TTL_SECONDS || '86400', 10);

/**
 * Calculate TTL timestamp
 */
function calculateTTL(): number {
    return Math.floor(Date.now() / 1000) + TASK_TTL_SECONDS;
}

/**
 * Atomically increment counter and return new value
 */
export async function incrementCounter(): Promise<number> {
    const result = await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: COUNTER_ID },
            UpdateExpression: 'ADD #counter :inc',
            ExpressionAttributeNames: {
                '#counter': 'counter',
            },
            ExpressionAttributeValues: {
                ':inc': 1,
            },
            ReturnValues: 'UPDATED_NEW',
        }),
    );

    return result.Attributes?.counter || 1;
}

/**
 * Get current counter value
 */
export async function getCounter(): Promise<number> {
    const result = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: COUNTER_ID },
        }),
    );

    return result.Item?.counter || 0;
}

/**
 * Create phrase
 */
export async function createPhrase(phrase: Phrase): Promise<void> {
    const phraseWithTtl = {
        ...phrase,
        ttl: calculateTTL(),
    };

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: phraseWithTtl,
        }),
    );
}

/**
 * Get phrase by ID
 */
export async function getPhrase(id: number): Promise<Phrase | null> {
    const result = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { id },
        }),
    );

    return result.Item as Phrase | null;
}

/**
 * List all phrases
 */
export async function listPhrases(): Promise<Phrase[]> {
    const result = await docClient.send(
        new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'id > :zero',
            ExpressionAttributeValues: {
                ':zero': 0,
            },
        }),
    );

    return (result.Items || []) as Phrase[];
}

