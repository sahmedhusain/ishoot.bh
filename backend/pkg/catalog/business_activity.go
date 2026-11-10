package catalog
import "slices"
var BusinessActivities []string
func init()					{ must(decode("business-activities.json", &BusinessActivities)) }
func IsBusinessActivity(value string) bool	{ return slices.Contains(BusinessActivities, value) }
