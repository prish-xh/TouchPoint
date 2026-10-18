import { afterEach, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { createPerceptronClient } from '@/lib/perceptron';
const detections = { finish_reason: 'complete', detections: [
 { mention: 'washer Power button (circle and line symbol)', point_box: {top_left:{x:4,y:32},bottom_right:{x:10,y:38}} },
 { mention: 'washing machine cycle selector rotary dial', point_box: { top_left:{x:23,y:25},bottom_right:{x:44,y:54} } },
 { mention: 'button labeled Temp', point_box: { top_left:{x:74,y:49},bottom_right:{x:80,y:53} } },
] };
afterEach(()=>vi.unstubAllEnvs());
it.each(['enabled','disabled','dark','missing'] as const)('live washer scan: %s', async mode=>{
 vi.stubEnv('PERCEPTRON_API_KEY','test'); vi.stubEnv('PERCEPTRON_MODEL','test');
 vi.stubEnv('TOUCHPOINT_LIVE_WASHER_MODEL',mode==='disabled'?'other-model':'GFW550SSN5WW');
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(mode==='missing'?{...detections,detections:[]}:detections))
 .mockResolvedValueOnce(Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({panelVisible:true,poweredOn:mode!=='dark',powerEvidence:mode==='dark'?'dark_panel':'lit_panel',selectedCycle:'normal',cycleEvidence:'dial_light',selectedTemperature:'cold',temperatureEvidence:'illuminated_selection'})}}]}));
 const bytes=await sharp({create:{width:100,height:100,channels:3,background:'white'}}).png().toBuffer();
 const result=await createPerceptronClient(fetcher).scan({applianceId:'laundry',routineId:'normal_cold',frame:{captureId:'scan',dataUrl:`data:image/png;base64,${bytes.toString('base64')}`}});
 expect(result.panelReady).toBe(mode==='enabled'||mode==='dark');
 expect(fetcher).toHaveBeenCalledTimes(mode==='disabled'||mode==='missing'?1:2);
});
