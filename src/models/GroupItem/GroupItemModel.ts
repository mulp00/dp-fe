import {Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";

export const GroupItemModel = types
    .model("GroupItemModel")
    .props({
        id: types.string,
        name: types.string,
        description: types.string,
        groupId: types.string,
        type: types.string,
        content: types.model({ciphertext: types.string, iv: types.string}),
        decrypted: types.boolean
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        clear() {
            self.id = ""
            self.name = ""
            self.description = ""
            self.groupId = ""
            self.type = ""
            self.content = {ciphertext: "", iv: ""}
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
    name: "",
    description: "",
    groupId: "",
    type: "",
    content: {ciphertext: "", iv: ""},
    decrypted: false,
})