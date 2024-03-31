import {Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";
import {Group, GroupModel, GroupSnapshotIn} from "./GroupModel";

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
        }
    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface GroupStore extends Instance<typeof GroupStoreModel> {
}

export interface GroupStoreSnapshotOut extends SnapshotOut<typeof GroupStoreModel> {
}

export interface GroupStoreSnapshotIn extends SnapshotIn<typeof GroupStoreModel> {
}

export const createGroupStoreDefaultModel = () => types.optional(GroupStoreModel, {})