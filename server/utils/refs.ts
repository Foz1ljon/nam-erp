// Mongoose `select` projections for populated references. Kept in a module with no imports so it is
// always initialised first (other utils build their populate lists from these at load time).
export const ITEM_REF = 'code name unit type productKind unitWeightKg serialTracked'
export const USER_REF = 'fullName username role'
export const LOCATION_REF = 'code name type active order'
