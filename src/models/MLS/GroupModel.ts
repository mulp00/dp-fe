import {Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";
import {MemberModel} from "../User/MemberModel";

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
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        setSerializedIdentity(serializedIdentity: string){
            self.serializedGroup = serializedIdentity
        },
        clear(){
            self.serializedGroup = ""
            self.users.forEach((user)=>user.clear())
            self.users.clear()
        },
        setEpoch(epoch: number){
            self.epoch = epoch
        },
        setLastEpoch(lastEpoch: number){
            self.lastEpoch = lastEpoch
        }
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
    creator: {id:"", email: "", keyPackage: ""},
    name: '',
    serializedGroup: '',
    lastEpoch: 1,
    epoch: 1,
})