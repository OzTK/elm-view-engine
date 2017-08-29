module Users exposing (view)

import Html exposing (Html, h1, div, text, ul, li)
import Json.Encode
import Json.Decode exposing (decodeValue, list, string)
import Json.Decode.Pipeline exposing (decode, required)
import Search


-- Model


type alias UsersContext =
    { users : List String }


titleContext : Json.Encode.Value -> Result String UsersContext
titleContext =
    decode UsersContext
        |> required "users" (list string)
        |> decodeValue



-- View


view : Json.Encode.Value -> Result String (Html Search.Msg)
view jsonCtx =
    titleContext jsonCtx
        |> Result.map render


render : UsersContext -> Html Search.Msg
render ctx =
    div
        []
        [ h1 [] [ text "Users" ]
        , Search.view (Search.search "")
        , ul [] <| List.map user ctx.users
        ]


user : String -> Html msg
user name =
    li [] [ text name ]
