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
})

it('should remove all expired jobs', function(){
    var lastNJobs = new LastNJobs(1000);
    var now = Date.now();
    var expiredJobs = [genJobs(now), genJobs(now)];
    var timestamp = now - 2000;
    expiredJobs.forEach(jobs => lastNJobs.addJobs(jobs, timestamp));
    lastNJobs.chainIndexedJobs.forEach(jobs => {
        expect(jobs.length).equal(2);
    });
   
    var jobs1 = genJobs(now);
    lastNJobs.addJobs(jobs1, now);
    expect(lastNJobs.chainIndexedJobs.flat()).to.deep.equal(jobs1);
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
