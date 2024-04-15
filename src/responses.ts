import { PutItemCommand, type DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { sortQuery } from './sortQueryString.js'
import { URLSearchParamsToObject } from './URLSearchParamsToObject.js'

export type Response = {
	// e.g. 'GET'
	method: string
	// without leading slash
	path: string
	queryParams?: URLSearchParams
	statusCode?: number
	/**
	 * Header + Body
	 *
	 * @see splitMockResponse
	 */
	body?: string
	ttl?: number
	// Whether to delete the message after sending it
	keep?: boolean
}

export const registerResponse = async (
	db: DynamoDBClient,
	responsesTable: string,
	response: Response,
): Promise<void> => {
	await db.send(
		new PutItemCommand({
			TableName: responsesTable,
			Item: marshall(
				{
					methodPathQuery: `${response.method} ${response.path}${response.queryParams !== undefined ? `?${sortQuery(response.queryParams)}` : ``}`,
					timestamp: new Date().toISOString(),
					statusCode: response.statusCode,
					body: response.body,
					queryParams:
						response.queryParams !== undefined
							? URLSearchParamsToObject(response.queryParams)
							: undefined,
					ttl: response.ttl,
					keep: response.ttl,
				},
				{ removeUndefinedValues: true },
			),
		}),
	)
}