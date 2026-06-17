const fs = require('fs');
const path = require('path');

const exts = ['.js','.ts','.tsx','.vue','.html','.css','.scss','.java','.go','.py'];
const ignore = ['node_modules','dist','build','.git','public','static'];
let total = 0;

function walk(dir){
  const list = fs.readdirSync(dir);
  for(let f of list){
    const full = path.join(dir,f);
    const stat = fs.statSync(full);
    if(stat.isDirectory()){
      if(!ignore.some(x=>f.includes(x))) walk(full);
    }else{
      if(exts.includes(path.extname(f))){
        const lines = fs.readFileSync(full,'utf8').split('\n').length;
        total += lines;
      }
    }
  }
}
walk('./');
console.log('粗略总行数(含空行注释)：',total);