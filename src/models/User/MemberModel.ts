import {Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";

export const MemberModel = types
    .model("MemberModel")
    .props({
        id: types.string,
        email: types.string,
        keyPackage: types.string
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        clear() {
            self.id = ""
            self.email = ""
            self.keyPackage = ""
        }
    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface Member extends Instance<typeof MemberModel> {
}

export interface MemberSnapshotOut extends SnapshotOut<typeof MemberModel> {
}

export interface MemberSnapshotIn extends SnapshotIn<typeof MemberModel> {
}

export const createMemberDefaultModel = () => types.optional(MemberModel, {id: "", email: "", keyPackage: ""})