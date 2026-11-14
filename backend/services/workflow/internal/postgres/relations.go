package postgres

import (
	"context"

	"platform.local/backend/services/workflow/internal/postgres/sqlcdb"
)

type MomAttendee = sqlcdb.WorkflowMomAttendee
type MomActionItem = sqlcdb.WorkflowMomActionItem
type DirectoryRef = sqlcdb.WorkflowDirectoryRef

func (s *Store) ListMOMsFiltered(ctx context.Context, p sqlcdb.ListMOMsFilteredParams) ([]MinuteOfMeeting, error) {
	return s.q.ListMOMsFiltered(ctx, p)
}

func (s *Store) DeleteMOM(ctx context.Context, id string) error {
	return s.q.DeleteMOM(ctx, id)
}

func (s *Store) ListMomAttendees(ctx context.Context, momID string) ([]MomAttendee, error) {
	return s.q.ListMomAttendees(ctx, momID)
}

func (s *Store) InsertMomAttendee(ctx context.Context, p sqlcdb.InsertMomAttendeeParams) (MomAttendee, error) {
	return s.q.InsertMomAttendee(ctx, p)
}

func (s *Store) DeleteMomAttendees(ctx context.Context, momID string) error {
	return s.q.DeleteMomAttendees(ctx, momID)
}

func (s *Store) ListMomActionItems(ctx context.Context, momID string) ([]MomActionItem, error) {
	return s.q.ListMomActionItems(ctx, momID)
}

func (s *Store) InsertMomActionItem(ctx context.Context, p sqlcdb.InsertMomActionItemParams) (MomActionItem, error) {
	return s.q.InsertMomActionItem(ctx, p)
}

func (s *Store) DeleteMomActionItems(ctx context.Context, momID string) error {
	return s.q.DeleteMomActionItems(ctx, momID)
}

func (s *Store) ListTasksFiltered(ctx context.Context, p sqlcdb.ListTasksFilteredParams) ([]Task, error) {
	return s.q.ListTasksFiltered(ctx, p)
}

func (s *Store) UpsertDirectoryRef(ctx context.Context, p sqlcdb.UpsertWorkflowDirectoryRefParams) error {
	return s.q.UpsertWorkflowDirectoryRef(ctx, p)
}

func (s *Store) ListDirectoryRefs(ctx context.Context, kind *string) ([]DirectoryRef, error) {
	return s.q.ListWorkflowDirectoryRefs(ctx, kind)
}
