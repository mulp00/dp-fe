import {applySnapshot, Instance, SnapshotIn, SnapshotOut, types} from "mobx-state-tree"
import { withSetPropAction } from "../helpers/withSetPropAction"

/**
 * Model description here for TypeScript hints.
 */

export const AuthStoreModel = types
    .model("AuthStore")
    .props({
        authToken: types.maybe(types.string),
        key: (types.array(types.integer))
    })
    .actions(withSetPropAction)
    .views((self) => ({
        isAuthenticated(): boolean{
            return !!self.authToken
        },
        getKeyAsUint8Array() {
            return new Uint8Array(self.key);
        }
    })) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        setAuthToken(token: string){
            self.authToken = token
        },
        setKey(key: Uint8Array) {
            applySnapshot(self.key,Array.from(new Uint8Array(key)));
        },
        clear(){
            self.authToken = ""
            self.key.clear()
        }

    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface AuthStore extends Instance<typeof AuthStoreModel> {
}

export interface AuthStoreSnapshotOut extends SnapshotOut<typeof AuthStoreModel> {
}

export interface AuthStoreSnapshotIn extends SnapshotIn<typeof AuthStoreModel> {
}

export const createAuthStoreDefaultModel = () => types.optional(AuthStoreModel, {key: [], authToken: ""})
