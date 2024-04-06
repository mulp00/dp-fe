import {applySnapshot, Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";
import {createMemberDefaultModel, MemberModel} from "../User/MemberModel";
import {GroupItemModel, GroupItemSnapshotIn} from "../GroupItem/GroupItemModel";

export const GroupModel = types
    .model("GroupModel")
    .props({
        groupId: types.string,
        serializedUserGroupId: types.string,
        name: types.string,
        creator: MemberModel,
        serializedGroup: types.string,
        users: types.array(MemberModel),
        lastEpoch: types.integer,
        epoch: types.integer,
        groupItems: types.array(GroupItemModel)
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        setSerializedIdentity(serializedIdentity: string){
            self.serializedGroup = serializedIdentity
        },
        clear(){
            self.groupId = ""
            self.serializedUserGroupId = ""
            self.name = ""
            self.creator.clear()
            self.creator = createMemberDefaultModel().create()
            self.serializedGroup = ""
            self.users.forEach((user)=>user.clear())
            self.users.clear()
            self.lastEpoch = 1
            self.epoch = 1
            self.groupItems.forEach((groupItem)=>groupItem.clear())
            self.groupItems.clear()
        },
        setEpoch(epoch: number){
            self.epoch = epoch
        },
        setLastEpoch(lastEpoch: number){
            self.lastEpoch = lastEpoch
        },
        addGroupItem(item: GroupItemSnapshotIn){
            self.groupItems.push(item)
        },
        getGroupItemIndex(groupItemId: string){
            return  self.groupItems.findIndex(g => g.id === groupItemId);
        },
        setGroupItems(groupItems: GroupItemSnapshotIn[]){
            applySnapshot(self.groupItems, groupItems)
        },
        updateGroupItem( groupItem: GroupItemSnapshotIn){
            const groupItemIndex = self.groupItems.findIndex(g => g.id === groupItem.id);
            if (groupItemIndex !== -1) {
                applySnapshot(self.groupItems[groupItemIndex], groupItem);
            }
            return self.groupItems[groupItemIndex]
        },
    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface Group extends Instance<typeof GroupModel> {
}

export interface GroupSnapshotOut extends SnapshotOut<typeof GroupModel> {
}

export interface GroupSnapshotIn extends SnapshotIn<typeof GroupModel> {
}

export const createGroupDefaultModel = () => types.optional(GroupModel, {
    groupId: "",
    serializedUserGroupId: "",
    creator: createMemberDefaultModel().create(),
    name: '',
    serializedGroup: '',
    lastEpoch: 1,
    epoch: 1,
})