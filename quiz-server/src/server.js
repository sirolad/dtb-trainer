import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { parseQuiz, quizSchema } from './schema.js';

export const RESOURCE_URI = 'ui://dtb-c1/quiz.html';
const htmlPath = resolve(dirname(fileURLToPath(import.meta.url)), '../public/quiz.html');

export function createAppServer() {
  const server = new McpServer({name:'dtb-c1-quiz',version:'0.1.0'});
  registerAppResource(server,'dtb-c1-quiz',RESOURCE_URI,{},async()=>({contents:[{
    uri:RESOURCE_URI,mimeType:RESOURCE_MIME_TYPE,text:readFileSync(htmlPath,'utf8')
  }]}));
  registerAppTool(server,'start_quiz',{
    title:'Start a DTB C1 quiz',
    description:'Render a clickable German DTB C1 quiz with its own score, error cards, weakness analysis and category lessons. Supply 1-20 complete questions with answer keys and individual feedback, plus exactly one structured lesson for every question category. Each lesson needs a rule, two contrasting examples, a common mistake with correction, and one four-option practice question with feedback. Use for diagnostic and mini-tests.',
    inputSchema:quizSchema.shape,
    _meta:{ui:{resourceUri:RESOURCE_URI}}
  },async args=>{
    try {
      const quiz=parseQuiz(args);
      return {
        content:[{type:'text',text:`${quiz.title}: ${quiz.questions.length} Fragen. Öffne das interaktive Quiz, wähle die Antworten und lies die Auswertung in der Oberfläche.`}],
        structuredContent:{quiz},
        _meta:{ui:{resourceUri:RESOURCE_URI}}
      };
    } catch(error) {
      return {isError:true,content:[{type:'text',text:`Ungültiges Quiz: ${error.message}`}]} ;
    }
  });
  return server;
}

export function createHttpServer() {
  return createServer(async (req,res)=>{
    const path = new URL(req.url ?? '/',`http://${req.headers.host ?? 'localhost'}`).pathname;
    if (path==='/' && req.method==='GET') {res.writeHead(200,{'content-type':'text/plain'}).end('DTB C1 quiz MCP server');return;}
    if (path!=='/mcp') {res.writeHead(404).end('Not Found');return;}
    if (req.method==='OPTIONS') {
      res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers':'content-type, mcp-session-id','Access-Control-Expose-Headers':'Mcp-Session-Id'}).end();return;
    }
    if (!['POST','GET','DELETE'].includes(req.method)) {res.writeHead(405).end('Method Not Allowed');return;}
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Expose-Headers','Mcp-Session-Id');
    const server=createAppServer();
    const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    res.on('close',()=>{transport.close();server.close();});
    try {await server.connect(transport);await transport.handleRequest(req,res);}
    catch(error) {console.error(error);if(!res.headersSent) res.writeHead(500).end('Internal server error');}
  });
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT ?? 8787);
  createHttpServer().listen(port,()=>console.log(`DTB C1 quiz listening on http://localhost:${port}/mcp`));
}
