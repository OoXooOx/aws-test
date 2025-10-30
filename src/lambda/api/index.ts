import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { incrementCounter, getCounter, createPhrase, getPhrase, listPhrases } from '../../shared/common-layer-alias';
import { AddPhraseRequest, ApiResponse } from '../../shared/types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Request:', event.httpMethod, event.path);

    try {
        // Route by path and method
        if (event.httpMethod === 'OPTIONS') {
            return createResponse(200, { success: true });
        }

        // POST /phrases - Add new phrase
        if (event.httpMethod === 'POST' && event.path === '/phrases') {
            return await handleAddPhrase(event);
        }

        // GET /phrases - List all phrases
        if (event.httpMethod === 'GET' && event.path === '/phrases') {
            return await handleListPhrases();
        }

        // GET /phrases/{id} - Get phrase by ID
        if (event.httpMethod === 'GET' && event.path.startsWith('/phrases/')) {
            return await handleGetPhrase(event);
        }

        // GET /counter - Get current counter
        if (event.httpMethod === 'GET' && event.path === '/counter') {
            return await handleGetCounter();
        }

        return createResponse(404, {
            success: false,
            error: 'Endpoint not found',
        });
    } catch (error) {
        console.error('Error:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error',
        });
    }
};

// POST /phrases - Add new phrase
async function handleAddPhrase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const body = parseBody<AddPhraseRequest>(event.body);

    if (!body.phrase || typeof body.phrase !== 'string') {
        return createResponse(400, {
            success: false,
            error: 'phrase is required (string)',
        });
    }

    // Validate max length
    if (body.phrase.length > 100) {
        return createResponse(400, {
            success: false,
            error: `Phrase too long. Maximum: 100 characters, received: ${body.phrase.length}`,
        });
    }

    // Atomically increment counter and get new ID
    const newId = await incrementCounter();

    // Store phrase with auto-generated ID
    await createPhrase({
        id: newId,
        phrase: body.phrase,
        createdAt: new Date().toISOString(),
    });

    console.log('Phrase added:', { id: newId, phrase: body.phrase });

    return createResponse(201, {
        success: true,
        data: {
            id: newId,
            phrase: body.phrase,
            message: 'Phrase added successfully',
        },
    });
}

// GET /phrases - List all phrases
async function handleListPhrases(): Promise<APIGatewayProxyResult> {
    const phrases = await listPhrases();
    const sortedPhrases = phrases.sort((a, b) => a.id - b.id);

    return createResponse(200, {
        success: true,
        data: {
            count: sortedPhrases.length,
            phrases: sortedPhrases,
        },
    });
}

// GET /phrases/{id} - Get phrase by ID
async function handleGetPhrase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const id = event.pathParameters?.id || event.path.split('/').pop();

    if (!id) {
        return createResponse(400, {
            success: false,
            error: 'ID is required',
        });
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
        return createResponse(400, {
            success: false,
            error: 'ID must be a positive number',
        });
    }

    const phrase = await getPhrase(numericId);

    if (!phrase) {
        return createResponse(404, {
            success: false,
            error: 'Phrase not found',
        });
    }

    return createResponse(200, {
        success: true,
        data: phrase,
    });
}

// GET /counter - Get current counter value
async function handleGetCounter(): Promise<APIGatewayProxyResult> {
    const counter = await getCounter();

    return createResponse(200, {
        success: true,
        data: {
            counter,
            message: 'Current counter value (total phrases added)',
        },
    });
}

// Utility functions
function parseBody<T>(body: string | null): T {
    if (!body) {
        throw new Error('Request body is required');
    }
    return JSON.parse(body);
}

function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
        body: JSON.stringify(body),
    };
}

