import {Instance, SnapshotOut, types} from "mobx-state-tree"
import {UserStoreModel} from "./User/UserStore";
import {AuthStoreModel} from "./Auth/AuthStore";
import {GroupStoreModel} from "./MLS/GroupStore";
import {GroupModel} from "./MLS/GroupModel";
import {MemberModel} from "./User/MemberModel";
import {UserModel} from "./User/UserModel";


/**
 * A RootStore model.
 */
export const RootStoreModel = types
    .model("RootStore")
    .props({
        userStore: types.optional(UserStoreModel, {} as any),
        authStore: types.optional(AuthStoreModel, {} as any),
        groupStore: types.optional(GroupStoreModel, {} as any),
    })
    .actions((self) => ({
        clear(){
            self.userStore.clear()
            self.authStore.clear()
            self.groupStore.clear()
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
