-- workspace-images allowed any mime type despite only ever being written by
-- uploadWorkspaceImage() (cloudSync.js), which only ever handles data:image
-- blobs (mood-board pins, logo images). Not an RLS gap -- writes were
-- already scoped to auth.uid()'s own folder -- but a signed-in user could
-- upload anything, not just images, into a bucket named and used for images
-- only. Matches client-uploads' existing image-type restriction.
update storage.buckets
set allowed_mime_types = array['image/png','image/jpeg','image/gif','image/webp','image/avif','image/svg+xml']
where id = 'workspace-images';
