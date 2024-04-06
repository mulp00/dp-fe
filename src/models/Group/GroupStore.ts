import {applySnapshot, Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";
import {GroupModel, GroupSnapshotIn} from "./GroupModel";
import {GroupItemSnapshotIn} from "../GroupItem/GroupItemModel";

export const GroupStoreModel = types
    .model("GroupStoreModel")
    .props({
        groups: types.array(GroupModel),
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        clear(){
            self.groups.forEach((group)=>group.clear())
            self.groups.clear()
        },
        createNew(group: GroupSnapshotIn){
            self.groups.push(group)
        },
        updateGroup(updatedGroupData: GroupSnapshotIn) {
            const groupIndex = self.groups.findIndex(g => g.groupId === updatedGroupData.groupId);
            if (groupIndex !== -1) {
                applySnapshot(self.groups[groupIndex], updatedGroupData);
            }
            return groupIndex
        },
        removeGroup(group: GroupSnapshotIn){
            try{
                const groupIndex = self.groups.findIndex(g => g.groupId === group.groupId);
                if (groupIndex !== -1) {
                    self.groups.remove(self.groups[groupIndex])
                }
            }catch {
                return false
            }
            return true
        },
        updateGroupItems(group: GroupSnapshotIn, groupItems: GroupItemSnapshotIn[]){
            const groupIndex = self.groups.findIndex(g => g.groupId === group.groupId);
            if (groupIndex !== -1) {
                applySnapshot(self.groups[groupIndex].groupItems, groupItems);
            }
            return self.groups[groupIndex]
        },
        addGroupItemToGroup(group: GroupSnapshotIn, item: GroupItemSnapshotIn){
            const groupIndex = self.groups.findIndex(g => g.groupId === group.groupId);
            if (groupIndex !== -1) {
                self.groups[groupIndex].addGroupItem(item)
            }
            return self.groups[groupIndex]
        },
        getGroupIndex(group: GroupSnapshotIn){
            return  self.groups.findIndex(g => g.groupId === group.groupId);
        }
    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface GroupStore extends Instance<typeof GroupStoreModel> {
}

export interface GroupStoreSnapshotOut extends SnapshotOut<typeof GroupStoreModel> {
}

export interface GroupStoreSnapshotIn extends SnapshotIn<typeof GroupStoreModel> {
}

export const createGroupStoreDefaultModel = () => types.optional(GroupStoreModel, {})