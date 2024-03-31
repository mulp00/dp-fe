import {Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree"
import {withSetPropAction} from "../helpers/withSetPropAction"
import {createUserDefaultModel} from "./UserModel";

/**
 * Model description here for TypeScript hints.
 */


export const UserStoreModel = types
    .model("UserStore")
    .props({
        me: createUserDefaultModel(),
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        clear(){
            self.me?.clear()
        }
    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface UserStore extends Instance<typeof UserStoreModel> {
}

export interface UserStoreSnapshotOut extends SnapshotOut<typeof UserStoreModel> {
}

export interface UserStoreSnapshotIn extends SnapshotIn<typeof UserStoreModel> {
}

export const createUserStoreDefaultModel = () => types.optional(UserStoreModel, {})
