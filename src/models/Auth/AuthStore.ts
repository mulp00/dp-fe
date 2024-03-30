import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "../helpers/withSetPropAction"

/**
 * Model description here for TypeScript hints.
 */

export const AuthStoreModel = types
    .model("AuthStore")
    .props({
        authToken: types.maybe(types.string)
    })
    .actions(withSetPropAction)
    .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
    .actions((self) => ({
        setAuthToken(token: string){
            self.authToken = token
        }

    })) // eslint-disable-line @typescript-eslint/no-unused-vars

export interface AuthStore extends Instance<typeof AuthStoreModel> {
}

export interface AuthStoreSnapshotOut extends SnapshotOut<typeof AuthStoreModel> {
}

export interface AuthStoreSnapshotIn extends SnapshotIn<typeof AuthStoreModel> {
}

export const createAuthStoreDefaultModel = () => types.optional(AuthStoreModel, {})
