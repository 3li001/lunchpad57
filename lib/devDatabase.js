/////////////////////
// TEST DATA DON'T USE IN PRODUCTION
/////////////////////
// const modules_data = require("../tmp_data/modules.json")
// const users_data = require("../tmp_data/users.json");

// const { Module } = require("../models/module")
// const { Assessment } = require("../models/assessment")
// const { Deliverable } = require("../models/deliverable")
// const { Milestone } = require("../models/milestone")
// const { StudyTask } = require("../models/studyTask")
// const { User } = require("../models/user")

const fs = require("node:fs");

/////////////////////
// This is a bunch of temp code until the database 
// is implemented, using JSON and hard-coded values 
// to test the functionality of the site. 
/////////////////////
class DevDatabase {
    constructor() {
        // this.modules = modules_data.modules.map(Module.Parse);
        // this.assessments = modules_data.assessments.map(Assessment.Parse);
        // this.deliverables = modules_data.deliverables.map(Deliverable.Parse);
        // this.users = users_data.map(User.Parse);
        // this.next_id = 0;
        // this.users.forEach(u => { if (u.getId() > this.next_id) this.next_id = u.getId(); });
        // this.next_id++;

        // this.tasks = modules_data.user_tasks || [];
        // this.milestones = modules_data.user_milestones || [];
        // this.activities = modules_data.user_activities || [];
        // this.activity_links = modules_data.activity_links || [];

        // this.next_task_id = Math.max(0, ...this.tasks.map(t => t.id), 0) + 1;
        // this.next_milestone_id = Math.max(0, ...this.milestones.map(m => m.id), 0) + 1;
        // this.next_activity_id = Math.max(0, ...this.activities.map(a => a.id), 0) + 1;
        // this.next_link_id = Math.max(0, ...this.activity_links.map(l => l.id), 0) + 1;
    }

    saveModules() {
        modules_data.user_tasks = this.tasks;
        modules_data.user_milestones = this.milestones;
        modules_data.user_activities = this.activities;
        modules_data.activity_links = this.activity_links;
        fs.writeFileSync("tmp_data/modules.json", JSON.stringify(modules_data, null, 4));
    }

    saveUsers() {
        fs.writeFileSync("tmp_data/users.json", JSON.stringify(this.users.map(u => u.Serialize()), null, 4));
    }

    /////////////////////
    // Study Task
    /////////////////////
    createStudyTask(user_id, assessment_id, name, type, requirement_value, dependencies, notes) {
        const now = new Date().toISOString();
        const task = {
            id: this.next_task_id++,
            user_id, assessment_id, name, type,
            requirement: { value: requirement_value },
            current_progress: 0,
            dependencies: dependencies || [],
            notes: notes || "",
            created_at: now, updated_at: now
        };
        this.tasks.push(task);
        this.saveModules();
        return task.id;
    }

    getStudyTasks(assessment_id, user_id) {
        return this.tasks.filter(t => t.assessment_id == assessment_id && t.user_id == user_id);
    }

    updateStudyTask(task_id, fields) {
        const task = this.tasks.find(t => t.id == task_id);
        if (!task) return;

        const allowed = ["name", "type", "requirement", "current_progress", "dependencies", "notes"];
        for (const [key, val] of Object.entries(fields)) {
            if (allowed.includes(key)) task[key] = val;
        }
        
        task.updated_at = new Date().toISOString();
        this.saveModules();
    }

    deleteStudyTask(task_id) {
        const idx = this.tasks.findIndex(t => t.id == task_id);
        if (idx !== -1) {
            this.tasks.splice(idx, 1);
            this.saveModules();
        }
    }

    isTaskComplete(task_id, all_tasks = null) {
        const tasks = all_tasks || this.tasks;
        const task = tasks.find(t => t.id == task_id);
        if (!task) return false;
        if (task.current_progress < task.requirement.value) return false;
        if (!task.dependencies || task.dependencies.length === 0) return true;
        return task.dependencies.every(dep_id => this.isTaskComplete(dep_id, tasks));
    }

    recalculateTaskProgress(task_id) {
        const total = this.activity_links
            .filter(link => link.task_id == task_id)
            .reduce((sum, link) => {
                const act = this.activities.find(a => a.id == link.activity_id);
                return sum + (act ? act.amount : 0);
            }, 0);

        const task = this.tasks.find(t => t.id == task_id);
        if (task) {
            task.current_progress = total;
            task.updated_at = new Date().toISOString();
            this.saveModules();
        }
        return total;
    }

    /////////////////////
    // Milestone
    /////////////////////
    createMilestone(user_id, assessment_id, name, due_date, related_task_ids, notes) {
        const milestone = {
            id: this.next_milestone_id++,
            user_id, assessment_id, name,
            due_date: due_date || null,
            related_task_ids: related_task_ids || [],
            completed: false,
            notes: notes || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.milestones.push(milestone);
        this.saveModules();
        return milestone.id;
    }

    getMilestones(assessment_id, user_id) {
        return this.milestones.filter(m => m.assessment_id == assessment_id && m.user_id == user_id);
    }

    updateMilestone(milestone_id, fields) {
        const m = this.milestones.find(m => m.id == milestone_id);
        if (!m) return;

        const allowed = ["name", "due_date", "related_task_ids", "completed", "notes"];
        for (const [key, val] of Object.entries(fields)) {
            if (allowed.includes(key)) m[key] = val;
        }
        
        m.updated_at = new Date().toISOString();
        this.saveModules();
    }

    deleteMilestone(milestone_id) {
        const idx = this.milestones.findIndex(m => m.id == milestone_id);
        if (idx !== -1) {
            this.milestones.splice(idx, 1);
            this.saveModules();
        }
    }

    /////////////////////
    // Activity
    /////////////////////
    createActivity(user_id, assessment_id, name, type, amount, time_spent, activity_date, notes, task_ids) {
        const activity = {
            id: this.next_activity_id++,
            user_id, assessment_id,
            name: name || "Unnamed activity",
            type, amount: parseFloat(amount),
            time_spent: parseFloat(time_spent) || 0,
            activity_date: activity_date || new Date().toISOString().slice(0, 10),
            notes: notes || "",
            created_at: new Date().toISOString()
        };

        this.activities.push(activity);
        for (const tid of task_ids) {
            this.activity_links.push({
                id: this.next_link_id++,
                activity_id: activity.id,
                task_id: parseInt(tid)
            });
        }

        this.saveModules();
        for (const tid of task_ids) this.recalculateTaskProgress(tid);
        return activity.id;
    }

    getActivities(assessment_id, user_id, task_id = null) {
        let acts = this.activities.filter(a => a.assessment_id == assessment_id && a.user_id == user_id);
        if (task_id !== null) {
            const link_ids = this.activity_links.filter(l => l.task_id == task_id).map(l => l.activity_id);
            acts = acts.filter(a => link_ids.includes(a.id));
        }
        return acts.map(a => ({
            ...a,
            task_ids: this.activity_links.filter(l => l.activity_id == a.id).map(l => l.task_id)
        }));
    }

    updateActivity(activity_id, fields) {
        const act = this.activities.find(a => a.id == activity_id);
        if (!act) return;

        const old_task_ids = this.activity_links.filter(l => l.activity_id == activity_id).map(l => l.task_id);
        const allowed = ["name", "type", "amount", "time_spent", "activity_date", "notes"];
        for (const [key, val] of Object.entries(fields)) {
            if (allowed.includes(key)) act[key] = val;
        }
        
        if (fields.task_ids !== undefined) {
            this.activity_links = this.activity_links.filter(l => l.activity_id != activity_id);
            for (const tid of fields.task_ids) {
                this.activity_links.push({
                    id: this.next_link_id++,
                    activity_id: activity_id,
                    task_id: parseInt(tid)
                });
            }
        }
        
        this.saveModules();
        const new_task_ids = fields.task_ids || old_task_ids;
        const all_ids = [...new Set([...old_task_ids, ...new_task_ids])];
        for (const tid of all_ids) this.recalculateTaskProgress(tid);
    }

    deleteActivity(activity_id) {
        const task_ids = this.activity_links.filter(l => l.activity_id == activity_id).map(l => l.task_id);
        this.activity_links = this.activity_links.filter(l => l.activity_id != activity_id);
        const idx = this.activities.findIndex(a => a.id == activity_id);
        if (idx !== -1) {
            this.activities.splice(idx, 1);
            this.saveModules();
            for (const tid of task_ids) this.recalculateTaskProgress(tid);
        }
    }

    /////////////////////
    // Progress
    /////////////////////
    getAssessmentProgress(user_id, assessment_id) {
        const milestones = this.getMilestones(assessment_id, user_id);
        if (milestones.length === 0) return 0;
        
        let completed = 0
        for (let m of milestones) {
            if (m.completed) completed++
        }
        
        return completed / milestones.length;
    }

    isAssessmentCompleted(user_id, assessment_id) {
        return this.getAssessmentProgress(user_id, assessment_id) >= 0.999;
    }

    getCompletedAssessments(user_id, module_code = null) {
        let assessments = module_code
            ? this.assessments.filter(a => a.getModuleCode() === module_code)
            : this.assessments.filter(a => this.getUserModules(user_id).includes(a.getModuleCode()));
        return assessments.filter(a => this.isAssessmentCompleted(user_id, a.getId()));
    }

    getUpcomingAssessments(user_id, module_code = null) {
        const now = new Date();
        let assessments = module_code
            ? this.assessments.filter(a => a.getModuleCode() === module_code)
            : this.assessments.filter(a => this.getUserModules(user_id).includes(a.getModuleCode()));
        return assessments.filter(a => !this.isAssessmentCompleted(user_id, a.getId()) && new Date(a.getEndDate()) >= now);
    }

    getMissedAssessments(user_id, module_code = null) {
        const now = new Date();
        let assessments = module_code
            ? this.assessments.filter(a => a.getModuleCode() === module_code)
            : this.assessments.filter(a => this.getUserModules(user_id).includes(a.getModuleCode()));
        return assessments.filter(a => !this.isAssessmentCompleted(user_id, a.getId()) && new Date(a.getEndDate()) < now);
    }

    getModules() { return modules_data.modules.map(Module.Parse); }
    getModule(module_code) { return this.modules.find(m => m.getCode() === module_code); }
    getModuleAssessments(module_code) { return this.assessments.filter(a => a.getModuleCode() === module_code); }
   
    getAssessment(assessment_id) { return this.assessments.find(a => a.getId() == assessment_id); }
    getAssessmentDeliverables(assessment_id) { return this.deliverables.filter(d => d.getAssessmentId() === assessment_id); }
   
    getUserModules(user_id) { return modules_data.user_modules.filter(m => m.user_id == user_id).map(m => m.module_code); }
    getUser(user_id) { return this.users.find(u => u.getId() == user_id); }
    getUserByEmail(email) { return this.users.find(u => u.getEmail() == email); }
    
    addUser(name, email, pass_hash) {
        let user = User.Parse({ id: this.next_id++, name, email, password: pass_hash });
        this.users.push(user);
        this.saveUsers();
    }
    
    deleteUser(user_id) {
        this.users.splice(this.users.findIndex(u => u.getId() == user_id), 1);
        this.saveUsers();
    }
    
    patchUser(user_id, patch) {
        this.users.find(u => u.getId() == user_id).setField(patch["field"], patch["value"]);
        this.saveUsers();
    }


    resetUserPassword(email, newHash) {
        const userIndex = this.users.findIndex(u => 
            u.getEmail().toLowerCase() === email.toLowerCase()
        );
        if (userIndex !== -1) {
            const user = this.users[userIndex];
            user.setField("password", newHash);
            this.saveUsers(); 
            console.log(` SUCCESS! private #password has been updated and saved for ${email}`);
            return true;
        }
        return false;
    }

}

let _db
module.exports = {
    /**
     * 
     * @returns {DevDatabase}
     */
    getDatabase() {
        return _db ??= new DevDatabase()
    }
}