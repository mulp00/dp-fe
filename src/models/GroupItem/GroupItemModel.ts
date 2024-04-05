import {Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";

export const GroupItemModel = types
    .model("GroupItemModel")
    .props({
        id: types.string,
        name: types.string,
        groupId: types.string,
        type: types.string,
        content: types.string,
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        clear() {
            self.name = ""
            self.groupId = ""
            self.type = ""
            self.content = ""
        },
    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface GroupItem extends Instance<typeof GroupItemModel> {
}

export interface GroupItemSnapshotOut extends SnapshotOut<typeof GroupItemModel> {
}

export interface GroupItemSnapshotIn extends SnapshotIn<typeof GroupItemModel> {
}

export const createGroupItemDefaultModel = () => types.optional(GroupItemModel, {
    id: "",
    groupId: "",
    content: "",
    type: "",
    name: ""
})