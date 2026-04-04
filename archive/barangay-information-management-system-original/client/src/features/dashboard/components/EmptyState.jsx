import React from "react";

const EmptyState = ({ icon: Icon, title, description }) => {
  return (
    <div className="flex items-center justify-center h-64 text-center">
      <div>
        <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default EmptyState;
