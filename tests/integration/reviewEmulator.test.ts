// @vitest-environment node
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'
import { once } from 'node:events'
import { generateKeyPairSync } from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'vitest'
import getPort from 'get-port'
import { CLERK_TEST_USER_ID } from '../mocks/clerkServerMock'
import type { Firestore } from 'firebase-admin/firestore'

const FIRESTORE_HOST = '127.0.0.1'
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080)
const FIRESTORE_ADDRESS = `${FIRESTORE_HOST}:${FIRESTORE_PORT}`
const PROJECT_ID = 'gulfara-review-emulator'
const EMULATOR_READY_SIGNAL = 'All emulators ready'

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? FIRESTORE_ADDRESS
process.env.FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID ?? PROJECT_ID
process.env.FIREBASE_ADMIN_CLIENT_EMAIL =
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? `${PROJECT_ID}@test-service-account.iam.gserviceaccount.com`
if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' })
}

const projectRoot = path.resolve(__dirname, '../../')
const FIREBASE_CLI = path.join(projectRoot, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js')
let emulatorProcess: ChildProcessWithoutNullStreams | null = null
let reviewHandler: (typeof import('../../api/review'))['reviewHandler']
let getAdminDb: () => Firestore
let emulatorPort = FIRESTORE_PORT
let emulatorConfigPath: string | null = null

async function startFirestoreEmulator(): Promise<void> {
  if (emulatorProcess) return

  if (!existsSync(FIREBASE_CLI)) {
    throw new Error(
      `Firebase CLI not found at ${FIREBASE_CLI}; install firebase-tools and run npm install`
    )
  }

  const requestedPort = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 0)
  const port = requestedPort || (await getPort({ port: FIRESTORE_PORT }))
  emulatorPort = port
  process.env.FIRESTORE_EMULATOR_HOST = `${FIRESTORE_HOST}:${port}`
  process.env.FIRESTORE_EMULATOR_PORT = String(port)

  const configPayload = {
    emulators: {
      firestore: {
        host: FIRESTORE_HOST,
        port
      }
    }
  }
  const configLocation = path.join(os.tmpdir(), `gulfara-firestore-emulator-${port}.json`)
  emulatorConfigPath = configLocation
  await fs.rm(configLocation, { force: true }).catch(() => undefined)
  await fs.writeFile(configLocation, JSON.stringify(configPayload))

  emulatorProcess = spawn(
    process.execPath,
    [
      FIREBASE_CLI,
      '--config',
      configLocation,
      'emulators:start',
      '--only',
      'firestore',
      '--project',
      PROJECT_ID,
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe']
    }
  )

  const currentProcess = emulatorProcess

  if (!currentProcess?.stdout) {
    throw new Error('Failed to capture emulator stdout')
  }

  const readyPromise = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      currentProcess?.stdout?.off('data', onStdout)
      currentProcess?.off('exit', onExit)
    }

    const onStdout = (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      process.stdout.write(`[firestore-emulator] ${text}`)
      if (text.includes(EMULATOR_READY_SIGNAL)) {
        cleanup()
        resolve()
      }
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`Firestore emulator exited early (code=${code})`))
    }

    currentProcess.stdout.on('data', onStdout)
    currentProcess.stderr?.on('data', (chunk) => {
      process.stderr.write(`[firestore-emulator-err] ${chunk.toString('utf8')}`)
    })
    currentProcess.once('exit', onExit)
  })

  return readyPromise
}

async function stopFirestoreEmulator(): Promise<void> {
  if (!emulatorProcess) return
  emulatorProcess.kill('SIGINT')
  await once(emulatorProcess, 'exit')
  emulatorProcess = null
  if (emulatorConfigPath) {
    await fs.rm(emulatorConfigPath, { force: true }).catch(() => undefined)
    emulatorConfigPath = null
  }
}

async function clearFirestoreCollections(db: Firestore): Promise<void> {
  const collections = ['srsData', 'userProgress', 'idempotency']
  await Promise.all(
    collections.map(async (collectionName) => {
      const documents = await db.collection(collectionName).listDocuments()
      await Promise.all(documents.map((doc) => doc.delete()))
    })
  )
}

describe('reviewHandler (Firestore emulator)', () => {
  beforeAll(async () => {
    await startFirestoreEmulator()
    const reviewModule = await import('../../api/review')
    reviewHandler = reviewModule.reviewHandler
    const adminModule = await import('../../lib/firebase/admin')
    getAdminDb = adminModule.adminDb
  }, 120000)

  beforeEach(async () => {
    const db = getAdminDb()
    await clearFirestoreCollections(db)
  })

  afterAll(async () => {
    await stopFirestoreEmulator()
  })

  test('persists review data once and respects idempotency', async () => {
    const cardId = '22222222-2222-2222-9222-222222222222'
    const payload = {
      userId: CLERK_TEST_USER_ID,
      cardId,
      quality: 4,
      timeSpent: 12000,
      correct: true,
      pointsEarned: 15
    }
    const requestId = 'emulator-request-1'

    const makeRequest = () =>
      new Request('http://localhost/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gulfara-request-id': requestId
        },
        body: JSON.stringify(payload)
      })

    const firstResponse = await reviewHandler(makeRequest())
    expect(firstResponse.status).toBe(200)
    const firstBody = await firstResponse.json()
    expect(firstBody.points).toBe(15)

    const db = getAdminDb()
    const progressDoc = await db.collection('userProgress').doc(CLERK_TEST_USER_ID).get()
    expect(progressDoc.exists).toBe(true)
    expect(progressDoc.data()?.points).toBe(15)

    const srsDoc = await db.collection('srsData').doc(`${CLERK_TEST_USER_ID}_${cardId}`).get()
    expect(srsDoc.exists).toBe(true)

    const secondResponse = await reviewHandler(makeRequest())
    expect(secondResponse.status).toBe(200)
    const secondBody = await secondResponse.json()
    expect(secondBody.points).toBe(15)

    const progressDocAfter = await db.collection('userProgress').doc(CLERK_TEST_USER_ID).get()
    expect(progressDocAfter.data()?.points).toBe(15)

    const idempotencyDoc = await db.collection('idempotency').doc(`${CLERK_TEST_USER_ID}_${requestId}`).get()
    expect(idempotencyDoc.exists).toBe(true)
  })
})
