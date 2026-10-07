// Only normalize the proven CRLF/LF difference in function-body SQL whitespace.
// Quoted strings/identifiers (including nested dollar quotes) retain exact bytes:
// their newlines can be values, not formatting. All other definition text stays.
function bodyLineEndings(body: string): string {
  let result='',i=0;
  const take=(end:number)=>{result+=body.slice(i,end);i=end;};
  while(i<body.length) {
    if(body.startsWith('--',i)) {
      const newline=body.slice(i).search(/[\r\n]/);
      take(newline<0?body.length:i+newline);continue;
    }
    if(body.startsWith('/*',i)) {
      let end=i+2,depth=1;
      while(end<body.length&&depth) {
        if(body.startsWith('/*',end)){depth++;end+=2;}
        else if(body.startsWith('*/',end)){depth--;end+=2;}
        else end++;
      }
      if(depth)throw new Error('Malformed function block comment');
      result+=body.slice(i,end).replaceAll('\r\n','\n');i=end;continue;
    }
    const quote=body[i];
    if(quote==="'"||quote==='"') {
      // E strings use backslash escapes; ordinary SQL strings use doubled quotes.
      const escape=quote==="'"&&/[eE]/.test(body[i-1]??'')&&!/[\w$\u0080-\uFFFF]/.test(body[i-2]??'');
      let end=i+1,closed=false;
      while(end<body.length) {
        if(escape&&body[end]==='\\'){end+=2;continue;}
        if(body[end]===quote) {
          if(body[end+1]===quote){end+=2;continue;}
          end++;closed=true;break;
        }
        end++;
      }
      if(!closed)throw new Error('Malformed function quoted literal');
      take(end);continue;
    }
    if(quote==='$'&&!/[\w$\u0080-\uFFFF]/.test(body[i-1]??'')) {
      const tag=/^\$(?:[A-Za-z_\u0080-\uFFFF][A-Za-z_0-9\u0080-\uFFFF]*)?\$/.exec(body.slice(i))?.[0];
      if(tag) {
        const end=body.indexOf(tag,i+tag.length);
        if(end<0)throw new Error('Malformed function dollar literal');
        take(end+tag.length);continue;
      }
    }
    if(body.startsWith('\r\n',i)){result+='\n';i+=2;}
    else {result+=body[i];i++;}
  }
  return result;
}

export function normalizeFunctionDefinition(definition: string): string {
  // pg_get_functiondef's complete declaration and delimiter stay byte-exact.
  // Refuse unfamiliar representations rather than silently reducing coverage.
  const opening=/\nAS (\$functionx*\$)/.exec(definition);
  if(!opening||!definition.endsWith(opening[1]!+'\n'))
    throw new Error('Unsupported function contract representation');
  const start=opening.index+opening[0].length,end=definition.length-opening[1]!.length-1;
  return definition.slice(0,start)+bodyLineEndings(definition.slice(start,end))+definition.slice(end);
}

export function normalizeContract(contract: unknown): unknown {
  if(!contract||typeof contract!=='object'||!('functions' in contract)||!Array.isArray(contract.functions))
    throw new Error('Malformed function contract');
  return {...contract,functions:contract.functions.map((f:unknown)=>{
    if(typeof f!=='string')throw new Error('Malformed function definition');
    return normalizeFunctionDefinition(f);
  })};
}
