


class HealthExecutor {
  async execute(intent, params) {
    switch (intent) {
      case 'health.track_steps':
        return await this._trackSteps(params);
      case 'health.log_meal':
        return await this._logMeal(params);
      case 'health.workout_reminder':
        return await this._setWorkoutReminder(params);
      case 'health.monitor_sleep':
        return await this._monitorSleep(params);
      case 'health.suggest_recipe':
        return await this._suggestRecipe(params);
      default:
        throw new Error(`HealthExecutor: Unsupported intent "${intent}"`);
    }
  }

  async _trackSteps(params) {
    console.log(`[Health] Logging ${params.count} steps for ${params.date || 'today'}`);
    return {
      status: 'success',
      message: `Daily steps (${params.count}) recorded.`,
      total_steps: params.count
    };
  }

  async _logMeal(params) {
    console.log(`[Health] Logging meal: ${params.meal_type} - ${params.foods.join(', ')}`);
    return {
      status: 'success',
      message: `${params.meal_type.charAt(0).toUpperCase() + params.meal_type.slice(1)} logged successfully.`,
      estimated_calories: params.calories || 500
    };
  }

  async _setWorkoutReminder(params) {
    console.log(`[Health] Setting workout reminder: ${params.type} at ${params.time}`);
    return {
      status: 'success',
      message: `Reminder set for ${params.type} at ${params.time}.`
    };
  }

  async _monitorSleep(params) {
    return {
      status: 'success',
      duration: params.duration_hours,
      quality: params.quality || 'good',
      message: `Sleep data for ${params.duration_hours} hours recorded.`
    };
  }

  async _suggestRecipe(params) {
    const recipes = [
    { name: "Quinoa Salad", diet: "vegan", ingredients: ["quinoa", "cucumber", "lemon"] },
    { name: "Grilled Salmon", diet: "keto", ingredients: ["salmon", "asparagus", "olive oil"] },
    { name: "Lentil Soup", diet: "vegetarian", ingredients: ["lentils", "carrots", "onion"] }];


    const suggestion = recipes.find((r) =>
    !params.dietary_preference || r.diet === params.dietary_preference
    ) || recipes[0];

    return {
      status: 'success',
      recipe: suggestion,
      message: `I suggest making ${suggestion.name}. It's ${suggestion.diet} friendly!`
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'health-mock' };
  }
}

module.exports = new HealthExecutor();