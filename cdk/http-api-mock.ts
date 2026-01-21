import { Toolkit } from '@aws-cdk/toolkit-lib'
import { CloudFormationClient } from '@aws-sdk/client-cloudformation'
import { packLambdaFromPath } from '@bifravst/aws-cdk-lambda-helpers'
import { packLayer } from '@bifravst/aws-cdk-lambda-helpers/layer'
import { stackOutput } from '@bifravst/cloudformation-helpers'
import commandLineArgs from 'command-line-args'
import { writeFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pJSON from '../package.json' with { type: 'json' }
import { randomString } from '../src/randomString.ts'
import { HTTPAPIMockApp } from './App.ts'
import type { StackOutputs } from './Stack.ts'

const options = commandLineArgs([
	{
		name: 'config',
		type: Boolean,
		defaultValue: false,
	},
	{
		name: 'destroy',
		type: Boolean,
		defaultValue: false,
	},
])

const loadConfig = async (): Promise<
	Partial<StackOutputs & { stackName: string }>
> => {
	try {
		const config = JSON.parse(
			await fs.readFile(
				path.join(process.cwd(), 'http-api-mock.json'),
				'utf-8',
			),
		)
		return config
	} catch {
		return {}
	}
}

const stackName =
	process.env.HTTP_API_MOCK_STACK_NAME ??
	(await loadConfig())?.stackName ??
	`http-api-mock-${randomString()}`

const saveConfig = async () => {
	writeFileSync(
		path.join(process.cwd(), 'http-api-mock.json'),
		JSON.stringify(
			{
				stackName,
				...(await stackOutput(new CloudFormationClient({}))<StackOutputs>(
					stackName,
				)),
			},
			null,
			2,
		),
	)
}

if (options.config === true) {
	await saveConfig()
	process.exit(0)
}

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
	await saveConfig()
}
