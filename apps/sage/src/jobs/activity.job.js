```javascript
import { ItemActivity } from "../models/lib/itemActivity.model.js";
import { Worker } from "bullmq";
import { redisConnection } from "../loaders/redis.loader.js";
import { Label } from "../models/lib/label.model.js";
import { User } from "../models/core/user.model.js";
import { Cycle } from "../models/lib/cycle.model.js"

// Security: Validate job data to prevent unauthorized operations
const validateJobData = (data) => {
    const requiredFields = ['actor', 'workspace', 'space'];
    for (const field of requiredFields) {
        if (!data[field]) {
            throw new Error(`Security validation failed: Missing required field ${field}`);
        }
    }
    
    // Validate ObjectId format to prevent injection
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(data.actor.toString())) {
        throw new Error('Security validation failed: Invalid actor ID format');
    }
    if (!objectIdRegex.test(data.workspace.toString())) {
        throw new Error('Security validation failed: Invalid workspace ID format');
    }
    if (!objectIdRegex.test(data.space.toString())) {
        throw new Error('Security validation failed: Invalid space ID format');
    }
    if (data.item && !objectIdRegex.test(data.item.toString())) {
        throw new Error('Security validation failed: Invalid item ID format');
    }
    
    return true;
};

// Security: Verify actor has permission to perform operations in workspace/space
const verifyActorPermissions = async (actor, workspace, space) => {
    const user = await User.findById(actor).select('_id workspaces').lean();
    if (!user) {
        throw new Error('Security validation failed: Actor not found');
    }
    
    // Verify user belongs to the workspace
    const hasWorkspaceAccess = user.workspaces && user.workspaces.some(
        ws => ws.toString() === workspace.toString()
    );
    
    if (!hasWorkspaceAccess) {
        throw new Error('Security validation failed: Actor does not have access to workspace');
    }
    
    return true;
};

// Track Changes in name
const trackName = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    if (currentInstance.name !== requestedData.name) {
        const lastActivity = await ItemActivity.findOne({ item }).sort({ createdAt: -1 }).exec();
        if (lastActivity && lastActivity.field === "name" && actor === lastActivity.actor.toString()) {
            lastActivity.newValue = requestedData.name;
            lastActivity.updatedAt = new Date();
            await lastActivity.save();
        } else {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                oldValue: currentInstance.name,
                newValue: requestedData.name,
                field: "name",
                space,
                workspace,
                comment: "updated the title",
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }
};

//  Track item description
const trackDescription = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    if (currentInstance.description !== requestedData.description) {
        const lastActivity = await ItemActivity.findOne({ item }).sort({ createdAt: -1 }).exec();
        if (lastActivity && lastActivity.field === "description" && actor === lastActivity.actor.toString()) {
            lastActivity.updatedAt = new Date();
            await lastActivity.save();
        } else {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                field: "description",
                space,
                workspace,
                comment: "updated the description",
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }
}

// Track changes in status
const trackStatus = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    if (currentInstance.status !== requestedData.status) {
        const lastActivity = await ItemActivity.findOne({ item }).sort({ createdAt: -1 }).exec();
        if (lastActivity && lastActivity.field === "status" && actor === lastActivity.actor.toString()) {
            lastActivity.newValue = requestedData.status;
            lastActivity.updatedAt = new Date();
            await lastActivity.save();
        } else {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                oldValue: currentInstance.status,
                newValue: requestedData.status,
                field: "status",
                space,
                workspace,
                comment: `updated the status from ${currentInstance.status} to ${requestedData.status}`,
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }
}

// Track changes in effort
const trackEffort = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    if (currentInstance.effort !== requestedData.effort) {
        const lastActivity = await ItemActivity.findOne({ item }).sort({ createdAt: -1 }).exec();
        if (lastActivity && lastActivity.field === "effort" && actor === lastActivity.actor.toString()) {
            lastActivity.newValue = requestedData.effort;
            lastActivity.updatedAt = new Date();
            await lastActivity.save();
        } else {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                oldValue: currentInstance.effort,
                newValue: requestedData.effort,
                field: "effort",
                space,
                workspace,
                comment: `updated the effort from ${currentInstance.effort} to ${requestedData.effort}`,
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }
}

// Track changes in item due date
const trackDueDate = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    if (currentInstance.dueDate !== requestedData.dueDate) {
        const lastActivity = await ItemActivity.findOne({ item }).sort({ createdAt: -1 }).exec();
        if (lastActivity && lastActivity.field === "dueDate" && actor === lastActivity.actor.toString()) {
            lastActivity.newValue = requestedData.dueDate;
            lastActivity.updatedAt = new Date();
            await lastActivity.save();
        } else {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                oldValue: currentInstance.dueDate ? currentInstance.dueDate : "",
                newValue: requestedData.dueDate ? requestedData.dueDate : "",
                field: "dueDate",
                space,
                workspace,
                comment: "updated the due date",
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }
}

// track changes in item labels
const trackLabels = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    const requestedLabels = new Set(requestedData.labels.map(lab => lab.toString()));
    const currentLabels = new Set(currentInstance.labels.map(lab => lab.toString()));

    const addedLabels = [...requestedLabels].filter(label => !currentLabels.has(label));
    const droppedLabels = [...currentLabels].filter(label => !requestedLabels.has(label));

    // Set of newly added labels
    for (const addedLabel of addedLabels) {
        const label = await Label.findById(addedLabel);
        if (label) {
            const itemActivity = new ItemActivity({
                item,
                actor,
                space,
                workspace,
                verb: "updated",
                field: "labels",
                comment: "added label",
                oldValue: "",
                newValue: label.name,
                newIdentifier: label._id,
                oldIdentifier: null,
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }

    // Set of dropped labels
    for (const droppedLabel of droppedLabels) {
        const label = await Label.findById(droppedLabel);
        if (label) {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                oldValue: label.name,
                newValue: "",
                field: "labels",
                space,
                workspace,
                comment: "removed label",
                oldIdentifier: label._id,
                newIdentifier: null,
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }
}

// track chnages in item assignees
const trackAssignees = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    const requestedAssignees = new Set((requestedData.assignees || []).map(asg => asg.toString()));
    const currentAssignees = new Set((currentInstance.assignees || []).map(asg => asg.toString()));

    const addedAssignees = [...requestedAssignees].filter(asg => !currentAssignees.has(asg));
    const droppedAssignees = [...currentAssignees].filter(asg => !requestedAssignees.has(asg));
    // const bulkSubscribers = [];

    for (const addedAssignee of addedAssignees) {
        const assignee = await User.findById(addedAssignee)
        if (assignee) {
            const itemActivity = new ItemActivity({
                item,
                actor,
                space,
                workspace,
                verb: "updated",
                field: "assignees",
                comment: "added assignee",
                oldValue: "",
                newValue: assignee.userName || assignee.fullName,
                newIdentifier: assignee._id,
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();

            // when implement Subscribers
            // bulkSubscribers.push({
            //     subscriberId: assignee._id,
            //     item,
            //     workspace,
            //     space,
            //     createdById: actor,
            //     updatedById: actor
            // });
        }
    }

    // Bulk insert new assignees as subscribers, ignoring duplicates
    // if (bulkSubscribers.length > 0) {
    //     await ItemSubscriber.insertMany(bulkSubscribers, { ordered: false });
    // }

    for (const droppedAssignee of droppedAssignees) {
        const assignee = await User.findById(droppedAssignee)
        if (assignee) {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                oldValue: assignee.userName || assignee.fullName,
                newValue: "",
                field: "assignees",
                space,
                workspace,
                comment: "removed assignee",
                oldIdentifier: assignee._id,
                cycle: currentInstance.cycles ? currentInstance.cycles[0] : null
            });

            await itemActivity.save();
        }
    }
}

// track chnages in item cycle
const trackCycle = async (
    requestedData,
    currentInstance,
    item,
    space,
    workspace,
    actor
) => {
    console.log("requ: ", requestedData);
    let updatedRecords;
    let createdRecords;
    let deleteRecord;

    if (currentInstance.cycles && requestedData.cycles && currentInstance.cycles.length && requestedData.cycles.length) {
        if (currentInstance.cycles[0] !== requestedData.cycles[0]) {
            updatedRecords = currentInstance.cycles;
        }
    } else if (Array.isArray(currentInstance.cycles) && currentInstance.cycles.length === 0 && requestedData.cycles) {
        createdRecords = requestedData.cycles;
    } else if (Array.isArray(currentInstance.cycles) && currentInstance.cycles.length > 0 && Array.isArray(requestedData.cycles) && requestedData.cycles.length === 0) {
        deleteRecord = currentInstance.cycles;
    }

    if (updatedRecords) {
        const oldCycle = await Cycle.findById(currentInstance.cycles);
        const newCycle = await Cycle.findById(requestedData.cycles);
        const lastActivity = await ItemActivity.findOne({ item }).sort({ createdAt: -1 }).exec();
        if (lastActivity && lastActivity.field === "cycle" && actor === lastActivity.actor.toString()) {
            lastActivity.newValue = newCycle.name;
            lastActivity.oldValue = oldCycle.name;
            lastActivity.comment = `updated cycle from ${oldCycle.name} to ${newCycle.name}`;
            lastActivity.updatedAt = new Date();
            await lastActivity.save();
        } else {
            const itemActivity = new ItemActivity({
                item,
                actor,
                verb: "updated",
                oldValue: oldCycle ? oldCycle.name : '',
                newValue: newCycle ? newCycle.name : '',
                field: "cycle",
                space,
                workspace,
                comment: `from ${oldCycle ? oldCycle.name : ''} to ${newCycle ? newCycle.name : ''}`,
                oldIdentifier: oldCycle ? oldCycle._id : null,
                newIdentifier: newCycle ? newCycle._id : null,
                cycle: requestedData.cycles[0]
            });

            await itemActivity.save();
        }
    }

    if (createdRecords) {
        const cycle = await Cycle.findById(requestedData.cycles);

        const itemActivity = new ItemActivity({
            item,
            actor,
            verb: "created",
            oldValue: '',
            newValue: cycle ? cycle.name : '',
            field: "cycle",
            space,
            workspace,
            comment: `to cycle ${cycle.name}`,
            newIdentifier: cycle ? cycle._id : null,
            cycle: requestedData.cycles[0]
        });

        await itemActivity.save();
    }
    if (deleteRecord) {
        const cycle = await Cycle.findById(currentInstance.cycles);

        const itemActivity = new ItemActivity({
            item,
            actor,
            verb: "deleted",
            oldValue: cycle ? cycle.name : '',
            newValue: '',
            field: "cycle",
            space,
            workspace,
            comment: `from ${cycle.name}`,
            oldIdentifier: cycle ? cycle._id : null,
            cycle: currentInstance.cycles[0]
        });

        await itemActivity.save();
    }
}

const createItemActivity = async (data) => {
    const { requestedData, currentInstance, item, space, workspace, actor } = data;

    const issueActivity = new ItemActivity({
        item,
        space,
        workspace,
        field: "item",
        comment: 'created the item',
        verb: 'created',
        actor,
        cycle: requestedData.cycles ? requestedData.cycles[0] : null
    });

    await issueActivity.save();

    if (requestedData.assignee_ids) {
        trackAssignees(requestedData, currentInstance, item, space, workspace, actor);
    }
}

const ITEM_ACTIVITY_MAPPER = {
    name: trackName,
    effort: trackEffort,
    status: trackStatus,
    description: trackDescription