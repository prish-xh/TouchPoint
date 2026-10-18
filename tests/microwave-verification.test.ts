import {it,expect} from 'vitest';
import {evaluateMicrowave} from '@/lib/server/microwave-verification';
it.each(['27','0:27','30'])('confirms visible bounded Cook setting %s', displayText=>{
 expect(evaluateMicrowave({readable:true,displayText,mode:'cook',cookIndicatorLit:true}).result).toBe('matched');
});
it.each(['58','1:00','31'])('rejects excess time %s',displayText=>{
 expect(evaluateMicrowave({readable:true,displayText,mode:'cook',cookIndicatorLit:true}).result).toBe('mismatched');
});
it.each(['0','0:00','1:99','Food','2?'])('does not guess %s',displayText=>{
 expect(evaluateMicrowave({readable:true,displayText,mode:'cook',cookIndicatorLit:true}).result).toBe('uncertain');
});
it.each(['clock','timer','unknown'] as const)('does not confirm %s as cooking',mode=>{
 expect(evaluateMicrowave({readable:true,displayText:'0:27',mode,cookIndicatorLit:true}).result).toBe('uncertain');
});
it('rejects Food prompt and unreadable display',()=>{
 expect(evaluateMicrowave({readable:true,displayText:'Food',mode:'food_prompt',cookIndicatorLit:true}).result).toBe('mismatched');
 expect(evaluateMicrowave({readable:false,displayText:'27',mode:'cook',cookIndicatorLit:true}).result).toBe('uncertain');
});
