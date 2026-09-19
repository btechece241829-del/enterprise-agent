const test=require('node:test');
const assert=require('node:assert/strict');
const {trajectory}=require('../public/prediction-trajectory');
test('all scenario paths start at recorded current position and end at existing projection amounts',()=>{
 for(const rate of [.2,.4,.6]){
  assert.deepEqual(trajectory(150,1000,rate,0),{progress:0,recovered:150,remaining:1000,additional:0});
  const end=trajectory(150,1000,rate,1);assert.equal(end.additional,1000*rate);assert.equal(end.recovered,150+1000*rate);assert.equal(end.remaining+end.additional,1000);
  assert.equal(trajectory(150,1000,rate,.5).additional,end.additional/2);
 }
});
test('zero opportunity yields flat recovery and invalid data cannot create negative values',()=>{
 assert.equal(trajectory(150,0,.6,1).recovered,150);
 assert.deepEqual(trajectory(NaN,-2,Infinity,1),{progress:100,recovered:0,remaining:0,additional:0});
});
