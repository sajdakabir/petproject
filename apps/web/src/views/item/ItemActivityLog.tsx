import { formattedDate } from "@/utils/helpers";

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

type ItemActivity = {
  _id: string;
  verb: string;
  comment: string;
  attachments: string[];
  oldIdentifier: null;
  newIdentifier: null;
  oldValue: string | null;
  newValue: string | null;
  space: string;
  workspace: string;
  item: string;
  actor: {
    userName: string;
    fullName: string;
  };
  uuid: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
};

type ItemActivityProps = {
  itemActivity: ItemActivity[] | undefined;
};

const activityMessages: Record<string, (activity: ItemActivity) => JSX.Element> = {
  description: (activity) => (
    <span>
      <strong>@{activity.actor.userName || activity.actor.fullName}</strong>
      <span className="text-gray-400"> updated the description</span>
    </span>
  ),
  name: (activity) => (
    <span>
      <strong>@{activity.actor.userName || activity.actor.fullName}</strong>
      <span className="text-gray-400"> set the name to </span>
      {activity.newValue}
    </span>
  ),
  effort: (activity) => (
    <span>
      <strong>@{activity.actor.userName || activity.actor.fullName}</strong>
      <span className="text-gray-400"> set the Effort to </span>
      <span className="font-medium text-custom-text-100">
        {activity.newValue ? capitalizeFirstLetter(activity.newValue) : "None"}
      </span>
    </span>
  ),
  status: (activity) => (
    <span>
      <strong>@{activity.actor.userName || activity.actor.fullName}</strong>
      <span className="text-gray-400"> set the Status to </span>
      <span className="font-medium text-custom-text-100">
        {activity.newValue ? capitalizeFirstLetter(activity.newValue) : "None"}
      </span>
    </span>
  ),
  dueDate: (activity) => {
    const formatted = activity.newValue
      ? new Date(activity.newValue).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        })
      : null;
    return (
      <span>
        <strong>@{activity.actor.userName || activity.actor.fullName}</strong>{" "}
        {formatted ? (
          <>
            <span className="text-gray-400"> set the due date to </span>
            <span className="font-medium text-custom-text-100">{formatted}</span>
          </>
        ) : (
          <span className="text-gray-400"> removed the due date</span>
        )}
      </span>
    );
  },
  assignees: (activity) => (
    <span>
      <strong>@{activity.actor.userName || activity.actor.fullName}</strong>
      {activity.oldValue ? (
        <span className="text-gray-400"> removed the assignee {activity.oldValue}</span>
      ) : (
        <span className="text-gray-400"> added a new assignee {activity.newValue}</span>
      )}
    </span>
  ),
  labels: (activity) => (
    <span>
      <strong>@{activity.actor.userName || activity.actor.fullName}</strong>
      {activity.oldValue ? (
        <span className="text-gray-400"> removed the label {activity.oldValue}</span>
      ) : (
        <span className="text-gray-400"> added a new label {activity.newValue}</span>
      )}
    </span>
  ),
  item: (activity) => (
    <span>
      <strong>@{activity.actor.userName || activity.actor.fullName}</strong>
      <span className="text-gray-400"> created the item</span>
    </span>
  ),
};

const ItemActivityLog = ({ itemActivity }: ItemActivityProps) => {
  return (
    <div className="flex flex-col items-center justify-start h-full overflow-y-auto">
      {itemActivity && itemActivity.length > 0 ? (
        itemActivity.map((item) => (
          <div
            key={item._id}
            className="w-full text-gray-300 flex flex-col py-2 justify-center gap-2 border-b border-gray-800"
          >
            <div className="flex items-center justify-between text-sm">
              <div>
                {activityMessages[item.verb] ? (
                  activityMessages[item.verb](item)
                ) : (
                  <span>
                    <strong>@{item.actor.userName || item.actor.fullName}</strong>{" "}
                    <span className="text-gray-400">performed an action</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
              {item.createdAt && formattedDate(new Date(item.createdAt))}

              </div>
            </div>
            {item.comment && (
              <div className="mt-1 p-2 bg-gray-800 rounded text-gray-300">
                {item.comment}
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-white">No activity found.</p>
      )}
    </div>
  );
};

export default ItemActivityLog;
