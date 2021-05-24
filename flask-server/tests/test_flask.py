from io import BytesIO
import json
import ast
import os


def test_getmodels(app, client):
    f = open(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test1.txt", "a")
    f.write("Test file!")
    f.close()
    res = client.post('/get-user-models',data=dict(id="607ee73f9f3e5f1b440b2ea3"))
    get_models = ast.literal_eval(res.data.decode("utf-8").split('\n')[0])
    expected = ["test1.txt","test_not_deleted.txt"]
    not_expected = ["test1.h5","test1.txt" ]
    assert expected == get_models
    assert len(expected) != 0
    assert not_expected != get_models
    os.remove(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test1.txt")

def test_deleteModel(app, client):
    f = open(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test2.txt", "a")
    f.write("Test file!")
    f.close()
    res = client.post('/delete-model',data={"id":"607ee73f9f3e5f1b440b2ea3","modelName":"test2.txt"})
    models_names = os.listdir(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/")
    models_names_return = ast.literal_eval(res.data.decode("utf-8").split('\n')[0])
    expected = ["test_not_deleted.txt"]
    assert expected==models_names
    assert expected==models_names_return

def test_deleteModel_dirnotexsit(app, client):
    res = client.post('/delete-model',data={"id":"notexsituser","modelName":"test2.txt"})
    expected = 'Error'
    assert expected == res.data.decode("utf-8")

def test_upload(app, client):
    # res = client.post('/upload',data={"id":"607ee73f9f3e5f1b440b2ea3", "model":(open('tests/Document2.png', "rb"), "testimg.png")})
    res = client.post('/upload',data={"id":"607ee73f9f3e5f1b440b2ea3", "model":(BytesIO(b'Test file'), "test3.txt")})
    models_names = os.listdir(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/")
    print(models_names)
    expected = "Uploaded to flask succesfully"
    assert expected == res.data.decode("utf-8")
    assert models_names == ["test3.txt","test_not_deleted.txt"]
    os.remove(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test3.txt")
    