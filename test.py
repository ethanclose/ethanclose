import subprocess
import os

# Inside your startup/initialization block:
def print_startup_model():
    # Fallback to check what model claude currently resolves to
    try:
        result = subprocess.run(
          ["claude", "--model", "claude-haiku-5-5", "-p", "reply with ok", "--output-format", "json"],
          capture_output=True,
          text=True,
          timeout=10
        )
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout)
            # Extract canonical model from modelUsage if present
            model_usage = data.get("modelUsage", {})
            active_model = list(model_usage.keys())[0] if model_usage else "unknown"
            print(f"🚀 Claude Code Bridge Active | Model: {active_model}")
        else:
            print("🚀 Claude Code Bridge Active | Model check failed, using default.")
    except Exception as e:
        print(f"🚀 Claude Code Bridge Active | Model: {os.environ.get('ANTHROPIC_MODEL', 'default')}")

# Call it when your script boots up
if __name__ == "__main__":
    print_startup_model()
    # Your existing socket/client startup logic here...
