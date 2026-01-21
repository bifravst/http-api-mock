import assert from 'node:assert'
import { describe, it } from 'node:test'
import { splitMockResponse } from './splitMockResponse.ts'
void describe('split mock response', () => {
	void it('should parse headers and body', () =>
		assert.deepEqual(
			splitMockResponse(`Content-Type: application/octet-stream

(binary A-GNSS data) other types`),
			{
				headers: {
					'Content-Type': 'application/octet-stream',
				},
				body: '(binary A-GNSS data) other types',
			},
		))
})
