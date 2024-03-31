import {Instance, SnapshotOut, types} from "mobx-state-tree"
import {UserStoreModel} from "./User/UserStore";
import {AuthStoreModel} from "./Auth/AuthStore";


/**
 * A RootStore model.
 */
export const RootStoreModel = types
    .model("RootStore")
    .props({
        userStore: types.optional(UserStoreModel, {} as any),
        authStore: types.optional(AuthStoreModel, {} as any),
    })
    .actions((self) => ({
        clear(){
            self.userStore.clear()
            self.authStore.clear()
        }
    }))

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {
}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {
}
