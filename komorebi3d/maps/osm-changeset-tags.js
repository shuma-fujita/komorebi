// Source of truth for OSM changeset attribution in Komorebi Builder.
// Shared by the test OSM writer and future production OSM writer.
// This metadata belongs to the changeset, never to building/shop OSM tags.
export const OSM_CHANGESET_CREATED_BY='Komorebi Builder';

export function buildOsmChangesetTags(comment){
 return {created_by:OSM_CHANGESET_CREATED_BY,comment};
}
