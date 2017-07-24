module UsersView exposing (view)

import Html exposing (Html, h1, div, ul, li, text, node)
import Html.Attributes exposing (rel, href, src, id)
import Json.Encode as JE
import Users
import ViewContext exposing (ViewContext)
import Layout


view : msg -> JE.Value -> Result String (Html msg)
view msg rawCtx =
    ViewContext.fromValue Users.flags rawCtx
        |> Result.map (render msg)
        |> Result.map (\r -> r rawCtx)


render : msg -> ViewContext Users.Flags -> JE.Value -> Html msg
render msg ctx =
    layout ctx <|
        div [ id "app" ] [ Users.root (\_ -> msg) (ctx.context |> Users.init |> Tuple.first) ]


layout : ViewContext Users.Flags -> Html msg -> JE.Value -> Html msg
layout ctx content rawCtx =
    Layout.view ctx.assets
        (css ctx.assets.users.css)
        (scripts ctx.assets.users.js rawCtx)
        content


css : Maybe String -> List (Html msg)
css asset =
    case asset of
        Just css ->
            [ node "link" [ rel "stylesheet", href css ] [] ]

        Nothing ->
            []


scripts : Maybe String -> JE.Value -> List (Html msg)
scripts asset rawCtx =
    case asset of
        Just js ->
            [ node "script" [] [ text <| "var context = " ++ JE.encode 4 rawCtx ++ ".context;" ]
            , node "script" [ src js ] []
            ]

        Nothing ->
            []
