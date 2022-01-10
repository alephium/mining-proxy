var LastNJobs = module.exports = function LastNJobs(expiryDuration){
    var _this = this;

    this.chainIndexedJobs = [];
    this.oldestJobTimestamp = Date.now();
    for (var i = 0; i < 16; i++){
        _this.chainIndexedJobs.push([]);
    }

    this.isEmpty = function(){
        return _this.chainIndexedJobs[0].length === 0;
    }

    this.removeOldestJobs = function(){
        _this.chainIndexedJobs.forEach(chainIndexedJob => {
            chainIndexedJob.shift();
        });
    }

    this.addJobs = function(jobs, now){
        if (_this.isEmpty()){
            _this.oldestJobTimestamp = now;
        }
        jobs.forEach(job => {
            job.timestamp = now;
            var chainIndex = job.fromGroup * global.GroupSize + job.toGroup;
            _this.chainIndexedJobs[chainIndex].push(job);
        });

        if (now - _this.oldestJobTimestamp > expiryDuration){
            _this.removeOldestJobs();
            _this.oldestJobTimestamp = _this.chainIndexedJobs[0][0].timestamp;
        }
    }

    // return null if job does not exist
    this.getJob = function(chainIndex, header){
        var jobs = _this.chainIndexedJobs[chainIndex];
        for (var idx = jobs.length - 1; idx >=0; idx--){
            var job = jobs[idx];
            if (!job.headerBlob.equals(header)){
                continue;
            }
            if (Date.now() - job.timestamp > expiryDuration) {
                return null;
            }
            return job;
        }
        return null;
    }
}
