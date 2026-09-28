import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAppServer, RESOURCE_URI } from '../src/server.js';
import { quiz, question } from './schema.test.js';

async function connect() {
  const server = createAppServer();
  const client = new Client({name:'quiz-test',version:'0.1.0'});
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
}
test('server returns validated quiz and UI resource metadata', async () => {
  const {server, client} = await connect();
  try {
    const result = await client.callTool({name:'start_quiz',arguments:quiz([question('q1'),question('q2'),question('q3')])});
    assert.equal(result.structuredContent.quiz.questions.length,3);
    assert.equal(result._meta.ui.resourceUri,RESOURCE_URI);
    assert.ok(result.content[0].text.includes('3 Fragen'));
    assert.ok(!result.content[0].text.includes('Antwort B'));
    const resource = await client.readResource({uri:RESOURCE_URI});
    assert.equal(resource.contents[0].mimeType,'text/html;profile=mcp-app');
  } finally { await client.close(); await server.close(); }
});
test('server rejects invalid quiz input with a tool error', async () => {
  const {server, client} = await connect();
  try {
    const result = await client.callTool({name:'start_quiz',arguments:quiz([{...question(),correctValue:'E'}])});
    assert.equal(result.isError,true);
  } finally { await client.close(); await server.close(); }
});
