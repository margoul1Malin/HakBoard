from leakcheck import LeakCheckAPI_Public

# Initialize without an API key
public_api = LeakCheckAPI_Public()

# Perform a public lookup
result = public_api.lookup(query="theo.morio@gmail.com")

print(result)