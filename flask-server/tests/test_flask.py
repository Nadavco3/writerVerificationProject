import json


def test_index(app, client):
    res = client.post('/get-user-models',data=dict(id="607ee73f9f3e5f1b440b2ea3"))
    print(res)
    