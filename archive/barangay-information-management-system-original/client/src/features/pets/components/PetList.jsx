import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint, User, Calendar, Palette } from "lucide-react";

const PetList = ({ pets = [], loading = false }) => {
  const calculateAge = (birthdate) => {
    if (!birthdate) return "-";
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      return age - 1;
    }
    return age;
  };

  const formatLabel = (text) => {
    if (!text) return "-";
    if (typeof text !== "string") {
      text = String(text);
    }
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-5 w-5" />
            Pets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading pets...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-5 w-5" />
            Pets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <PawPrint className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No pets found</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PawPrint className="h-5 w-5" />
          Pets ({pets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pets.map((pet) => (
            <div
              key={pet.pet_id}
              className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {/* Pet Image */}
                <div className="flex-shrink-0">
                  {pet.picture_path ? (
                    <img
                      src={pet.picture_path}
                      alt={pet.pet_name}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-lg border flex items-center justify-center">
                      <PawPrint className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Pet Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h3 className="font-semibold text-base sm:text-lg">{pet.pet_name}</h3>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <Badge variant="outline" className="capitalize text-xs sm:text-sm">
                        {pet.species}
                      </Badge>
                      <Badge variant="secondary" className="capitalize text-xs sm:text-sm">
                        {pet.sex}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Palette className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Color:</span>
                      <span className="capitalize">
                        {formatLabel(pet.color)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Age:</span>
                      <span>{calculateAge(pet.birthdate)} years</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Owner:</span>
                      <span>{pet.owner_name}</span>
                    </div>

                    {pet.breed && (
                      <div className="flex items-center gap-2">
                        <PawPrint className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Breed:</span>
                        <span className="capitalize">
                          {formatLabel(pet.breed)}
                        </span>
                      </div>
                    )}
                  </div>

                  {pet.description && (
                    <div className="mt-3">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {pet.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PetList;
