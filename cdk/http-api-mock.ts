import { Toolkit } from '@aws-cdk/toolkit-lib'
import { packLambdaFromPath } from '@bifravst/aws-cdk-lambda-helpers'
import { packLayer } from '@bifravst/aws-cdk-lambda-helpers/layer'
import { fromEnv } from '@bifravst/from-env'
import commandLineArgs from 'command-line-args'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pJSON from '../package.json' with { type: 'json' }
import { HTTPAPIMockApp } from './App.ts'

const options = commandLineArgs([
	{
		name: 'destroy',
		type: Boolean,
		defaultValue: false,
	},
])

const { stackName } = fromEnv({ stackName: 'HTTP_API_MOCK_STACK_NAME' })(
	process.env,
)

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'temp-'))
const lambdasDir = path.join(distDir, 'lambdas')
await fs.mkdir(lambdasDir)
const layersDir = path.join(distDir, 'layers')
await fs.mkdir(layersDir)

const dependencies: Array<keyof (typeof pJSON)['dependencies']> = [
	'@bifravst/from-env',
]

const app = new HTTPAPIMockApp(stackName, {
	lambdaSources: {
		httpApiMock: await packLambdaFromPath({
			id: 'httpApiMock',
			sourceFilePath: 'cdk/resources/http-api-mock-lambda.ts',
			baseDir,
			distDir: lambdasDir,
		}),
	},
	layer: await packLayer({
		id: 'testResources',
		dependencies,
		baseDir,
		distDir: layersDir,
	}),
})

const cdk = new Toolkit()

const cx = await cdk.fromAssemblyBuilder(async () => app.synth())

if (options.destroy === true) {
	await cdk.destroy(cx)
} else {
	await cdk.deploy(cx)
}
