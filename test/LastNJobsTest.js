var LastNJobs = require('../LastNJobs.js');
var { randomBytes } = require('crypto');
const { expect } = require('chai');

global.GroupSize = 4;

function genJobs(now){
    var jobs = [];
    for (var idx = 0; idx < 16; idx++){
        jobs.push({
            timestamp: now,
            fromGroup: Math.floor(idx / 4),
            toGroup: idx % 4,
            headerBlob: randomBytes(16)
        });
    }
    return jobs;
}

it('should update jobs', function(){
    var lastNJobs = new LastNJobs(1000);
    var allJobs = [];
    for (var idx = 0; idx < 20; idx++){
        var now = Date.now();
        var jobs = genJobs(now);
        allJobs.push(jobs);
        lastNJobs.addJobs(jobs, now);
    }

    for (var idx = 0; idx < 16; idx++){
        var chainIndexedJobs = allJobs.map(jobs => jobs[idx]);
        expect(chainIndexedJobs).to.deep.equal(lastNJobs.chainIndexedJobs[idx]);
    }
    expect(lastNJobs.oldestJobTimestamp).equal(lastNJobs.chainIndexedJobs[0][0].timestamp);
})

it('should remove expired jobs', function(){
    var lastNJobs = new LastNJobs(1000);
    var now = Date.now();
    var jobs0 = genJobs(now);
    var timestamp = now - 2000;
    lastNJobs.addJobs(jobs0, timestamp);
    lastNJobs.chainIndexedJobs.forEach(jobs => {
        expect(jobs.length).equal(1);
    });
    expect(lastNJobs.oldestJobTimestamp).equal(timestamp);
   
    var jobs1 = genJobs(now);
    lastNJobs.addJobs(jobs1, now);
    expect(lastNJobs.chainIndexedJobs.flat()).to.deep.equal(jobs1);
    expect(lastNJobs.oldestJobTimestamp).equal(lastNJobs.chainIndexedJobs[0][0].timestamp);
})

it('should get job', function(){
    var lastNJobs = new LastNJobs(1000);
    var now = Date.now();
    var jobs = genJobs(now);
    lastNJobs.addJobs(jobs, now);
    for(var job of jobs){
        var chainIndex = job.fromGroup * global.GroupSize + job.toGroup;
        var expected = lastNJobs.getJob(chainIndex, job.headerBlob);
        expect(expected).equal(job);
    }
})

it('should failed if job not exist', function(){
    var lastNJobs = new LastNJobs(1000);
    var now = Date.now();
    var jobs = genJobs(now);
    lastNJobs.addJobs(jobs, now);
    for(var job of jobs){
        var chainIndex = job.fromGroup * global.GroupSize + job.toGroup;
        var expected = lastNJobs.getJob(chainIndex, randomBytes(16));
        expect(expected).equal(null);
    }
})

it('should failed if job expired', function(){
    var lastNJobs = new LastNJobs(1000);
    var now = Date.now();
    var jobs = genJobs(now);
    lastNJobs.addJobs(jobs, now - 2000);
    for(var job of jobs){
        var chainIndex = job.fromGroup * global.GroupSize + job.toGroup;
        var expected = lastNJobs.getJob(chainIndex, job.headerBlob);
        expect(expected).equal(null);
    }
})
