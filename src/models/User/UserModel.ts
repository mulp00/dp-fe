import {Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree";
import {withSetPropAction} from "../helpers/withSetPropAction";

export const UserModel = types
    .model("UserModel")
    .props({
        email: types.string,
        serializedIdentity: types.string,
        keyPackage:types.string,
        keyStore: types.string,
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        setSerializedIdentity(serializedIdentity: string){
            self.serializedIdentity = serializedIdentity
        },
        clear(){
          self.email = ""
          self.serializedIdentity = ""
        },
        setKeyStore(keyStore: string){
            self.keyStore = keyStore
        },
        setKeyPackage(keyPackage: string){
            self.keyPackage = keyPackage
        }
    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface User extends Instance<typeof UserModel> {
}

export interface UserSnapshotOut extends SnapshotOut<typeof UserModel> {
}

export interface UserSnapshotIn extends SnapshotIn<typeof UserModel> {
}

export const createUserDefaultModel = () => types.optional(UserModel, {email: "", serializedIdentity: "", keyPackage: "", keyStore: ""})